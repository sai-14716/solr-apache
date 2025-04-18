// Constants
const SOLR_URL = 'http://localhost:8983/solr/searchcore';
const ROWS_PER_PAGE = 10;

// DOM Elements
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const suggestionsContainer = document.getElementById('suggestions');
const searchResults = document.getElementById('search-results');
const resultsStats = document.getElementById('results-stats');
const pagination = document.getElementById('pagination');
const categoryFacets = document.getElementById('category-facets')?.querySelector('.facet-items');
const tagsFacets = document.getElementById('tags-facets')?.querySelector('.facet-items');
const responseTimeElement = document.getElementById('response-time');

// State
let currentQuery = '';
let currentPage = 0;
let selectedFacets = {
    category: [],
    tags: []
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load suggestions as the user types
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSuggestions, 300));
    }
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (suggestionsContainer && !suggestionsContainer.contains(e.target) && e.target !== searchInput) {
            suggestionsContainer.style.display = 'none';
        }
    });
    
    // Handle search form submission
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            currentQuery = searchInput.value.trim();
            currentPage = 0;
            if (currentQuery) {
                performSearch();
            }
        });
    }

    // Handle file upload form submission
    const uploadForm = document.getElementById('upload-document');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(event) {
            event.preventDefault();
            console.log("Starting the indexing");
            indexDocumentToSolr();
        });
    }

    // Handle file input change
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const fileName = e.target.files[0] ? e.target.files[0].name : '';
            const fileNameElement = document.getElementById('file-name');
            if (fileNameElement) {
                fileNameElement.textContent = fileName;
            }
            
            // Enable/disable the upload button based on file selection
            const uploadButton = document.getElementById('upload-button');
            if (uploadButton) {
                uploadButton.disabled = !fileName;
            }
        });
    }

    // Set up drag and drop functionality
    setupDragAndDrop();

    // Set up status observer
    setupStatusObserver();
});

// Functions
function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Setup drag and drop functionality
function setupDragAndDrop() {
    const dropArea = document.querySelector('.file-input-label');
    if (!dropArea) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    dropArea.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    this.style.backgroundColor = '#d1ecf1';
    this.style.borderColor = '#0c5460';
}

function unhighlight() {
    this.style.backgroundColor = '#e9ecef';
    this.style.borderColor = '#ced4da';
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    const fileInput = document.getElementById('file-upload');
    const fileNameElement = document.getElementById('file-name');
    const uploadButton = document.getElementById('upload-button');
    
    if (files.length && fileInput) {
        fileInput.files = files;
        if (fileNameElement) {
            fileNameElement.textContent = files[0].name;
        }
        if (uploadButton) {
            uploadButton.disabled = false;
        }
    }
}

// Setup status observer
function setupStatusObserver() {
    const statusElement = document.getElementById('upload-status');
    if (!statusElement) return;

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'characterData' || mutation.type === 'childList') {
                const content = statusElement.textContent.toLowerCase();
                
                statusElement.classList.remove('status-processing', 'status-success', 'status-error', 'loading');
                
                if (content.includes('processing') || content.includes('uploading')) {
                    statusElement.classList.add('status-processing', 'loading');
                } else if (content.includes('success')) {
                    statusElement.classList.add('status-success');
                } else if (content.includes('error') || content.includes('failed')) {
                    statusElement.classList.add('status-error');
                }
            }
        });
    });

    observer.observe(statusElement, { childList: true, characterData: true, subtree: true });
}

// Function to handle file upload and Solr indexing with PDF.js support
function indexDocumentToSolr() {
    // Get the form element
    const form = document.getElementById('upload-document');
    const fileInput = form.querySelector('input[type="file"]');
    
    // Check if a file is selected
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert("Please select a file to upload");
        return false;
    }
    
    const file = fileInput.files[0];
    const fileName = file.name;
    
    // Show loading indicator
    const statusElement = document.getElementById('upload-status');
    if (statusElement) {
        statusElement.textContent = "Processing and indexing document...";
    }
    
    // Different handling based on file type
    if (file.type === 'application/pdf') {
        // Handle PDF files with PDF.js
        processPdfFile(file, fileName, SOLR_URL, statusElement);
    } else {
        // Handle other file types directly
        processTextFile(file, fileName, SOLR_URL, statusElement);
    }
    
    return false; // Prevent form submission
}

// Function to process and index a PDF file with enhanced page and paragraph extraction
function processPdfFile(file, fileName, solr_url, statusElement) {
    const fileReader = new FileReader();
    
    fileReader.onload = function(event) {
        const typedArray = new Uint8Array(event.target.result);
        
        // Load the PDF with PDF.js
        pdfjsLib.getDocument(typedArray).promise.then(function(pdf) {
            console.log(`PDF loaded: ${fileName}, pages: ${pdf.numPages}`);
            
            // Array to store all page text
            const pagesPromises = [];
            
            // Extract text from each page
            for (let i = 1; i <= pdf.numPages; i++) {
                pagesPromises.push(getPageTextWithParagraphs(pdf, i));
            }
            
            // Process all pages
            Promise.all(pagesPromises).then(function(pagesData) {
                // Index each page and paragraph separately
                const indexPromises = [];
                
                pagesData.forEach((pageData, pageIndex) => {
                    const pageNumber = pageIndex + 1;
                    
                    // Index each paragraph separately
                    pageData.paragraphs.forEach((paragraph, paraIndex) => {
                        if (paragraph.trim().length > 0) {
                            const paraId = `${fileName}_page${pageNumber}_para${paraIndex + 1}`;
                            
                            // Create a document object for this paragraph
                            const doc = {
                                'id': paraId,
                                'content': paragraph,
                                'paragraph_text': paragraph,
                                'file_name': fileName,
                                'page_number': pageNumber,
                                'paragraph_number': paraIndex + 1,
                                'page_count': pdf.numPages,
                                'title': `${fileName} - Page ${pageNumber}`,
                                'last_modified': new Date().toISOString()
                            };

                            console.log(doc);
                            
                            indexPromises.push(
                                indexSingleDocToSolr(doc, solr_url)
                                .catch(error => {
                                    console.error(`Error indexing paragraph ${paraIndex + 1} of page ${pageNumber}:`, error);
                                    return false; // Continue with other paragraphs even if one fails
                                })
                            );
                        }
                    });
                });
                
                // Wait for all indexing to complete
                Promise.all(indexPromises).then(results => {
                    const successCount = results.filter(Boolean).length;
                    console.log(`Indexed ${successCount} paragraphs from PDF`);
                    
                    // Final commit to Solr
                    fetch(`${solr_url}/update?commit=true`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: '{}'
                    })
                    .then(() => {
                        if (statusElement) {
                            statusElement.textContent = `Document successfully indexed with ${successCount} paragraphs!`;
                        }
                        alert(`Document has been successfully indexed with ${successCount} paragraphs!`);
                    })
                    .catch(error => {
                        console.error("Error committing to Solr:", error);
                        if (statusElement) {
                            statusElement.textContent = "Error finalizing indexing.";
                        }
                    });
                });
            });
        }).catch(function(error) {
            console.error(`Error processing PDF: ${error}`);
            if (statusElement) {
                statusElement.textContent = "Error processing PDF.";
            }
            alert(`Failed to process PDF: ${error.message}`);
        });
    };
    
    fileReader.onerror = function() {
        console.error(`Failed to read file: ${fileReader.error}`);
        if (statusElement) {
            statusElement.textContent = "Error reading file.";
        }
        alert("Failed to read file.");
    };
    
    fileReader.readAsArrayBuffer(file);
}

// Function to extract text and paragraphs from a specific PDF page
function getPageTextWithParagraphs(pdf, pageNumber) {
    return pdf.getPage(pageNumber).then(function(page) {
        return page.getTextContent().then(function(textContent) {
            // Concatenate the text items into a string
            const pageText = textContent.items.map(item => item.str).join(' ');
            
            // Split into paragraphs (simple approach - can be improved)
            const paragraphs = splitIntoParagraphs(pageText);
            
            return {
                pageNumber: pageNumber,
                text: pageText,
                paragraphs: paragraphs
            };
        });
    });
}

// Function to split text into paragraphs
function splitIntoParagraphs(text) {
    // Replace multiple spaces with single space
    text = text.replace(/\s+/g, ' ');
    
    // Split by double linebreaks or significant whitespace patterns
    const roughParagraphs = text.split(/\n\s*\n|\.\s+(?=[A-Z])/);
    
    // Clean up paragraphs and filter out empty ones
    return roughParagraphs
        .map(p => p.trim())
        .filter(p => p.length > 0);
}

// Function to process and index a text file with paragraph extraction
function processTextFile(file, fileName, solr_url, statusElement) {
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const textContent = event.target.result;
        
        // Split content into paragraphs
        const paragraphs = splitIntoParagraphs(textContent);
        const indexPromises = [];
        
        // Index each paragraph separately
        paragraphs.forEach((paragraph, paraIndex) => {
            if (paragraph.trim().length > 0) {
                const paraId = `${fileName}_para${paraIndex + 1}`;
                
                // Create document object for this paragraph
                const doc = {
                    'id': paraId,
                    'content': paragraph,
                    'paragraph_text': paragraph,
                    'file_name': fileName,
                    'paragraph_number': paraIndex + 1,
                    'title': fileName,
                    'last_modified': new Date().toISOString()
                };
                
                console.log(`The para is :${doc}`);
                indexPromises.push(
                    indexSingleDocToSolr(doc, solr_url)
                    .catch(error => {
                        console.error(`Error indexing paragraph ${paraIndex + 1}:`, error);
                        return false; // Continue with other paragraphs even if one fails
                    })
                );
            }
        });
        
        // Wait for all indexing to complete
        Promise.all(indexPromises).then(results => {
            const successCount = results.filter(Boolean).length;
            console.log(`Indexed ${successCount} paragraphs from text file`);
            
            // Final commit to Solr
            fetch(`${solr_url}/update?commit=true`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: '{}'
            })
            .then(() => {
                if (statusElement) {
                    statusElement.textContent = `Document successfully indexed with ${successCount} paragraphs!`;
                }
                alert(`Document has been successfully indexed with ${successCount} paragraphs!`);
            })
            .catch(error => {
                console.error("Error committing to Solr:", error);
                if (statusElement) {
                    statusElement.textContent = "Error finalizing indexing.";
                }
            });
        });
    };
    
    reader.onerror = function() {
        console.error(`Failed to read file: ${reader.error}`);
        if (statusElement) {
            statusElement.textContent = "Error reading file.";
        }
        alert("Failed to read file.");
    };
    
    reader.readAsText(file);
}

// Function to index a single document to Solr
function indexSingleDocToSolr(doc, solr_url) {
    return fetch(`${solr_url}/update/json/docs?commitWithin=1000`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(doc)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${text}`);
            });
        }
        return true; // Success
    });
}

// Legacy function for backward compatibility
function indexDocToSolr(doc, fileName, solr_url, statusElement) {
    console.log("Sending document to Solr:", doc);
    
    // Send to Solr for indexing
    fetch(`${solr_url}/update?commit=true`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([doc])
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${text}`);
            });
        }
        return response.text();
    })
    .then(data => {
        console.log(`Indexed ${fileName}: Success`, data);
        if (statusElement) {
            statusElement.textContent = "Document successfully indexed!";
        }
        alert("Document has been successfully indexed!");
    })
    .catch(error => {
        console.error(`Error indexing ${fileName}:`, error);
        if (statusElement) {
            statusElement.textContent = "Error indexing document. See console for details.";
        }
        alert("Failed to index document. Error: " + error.message);
    });
}

async function handleSuggestions() {
    const query = searchInput.value.trim();
    if (query.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`${SOLR_URL}/suggest?q=${encodeURIComponent(query)}&wt=json`);
        const data = await response.json();
        
        // Extract suggestions from the response
        const suggestions = data.suggest?.mySuggester?.[query]?.suggestions || [];
        
        if (suggestions.length > 0) {
            renderSuggestions(suggestions);
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        suggestionsContainer.style.display = 'none';
    }
}

function renderSuggestions(suggestions) {
    suggestionsContainer.innerHTML = '';
    
    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = suggestion.term;
        
        suggestionItem.addEventListener('click', () => {
            searchInput.value = suggestion.term;
            suggestionsContainer.style.display = 'none';
            currentQuery = suggestion.term;
            currentPage = 0;
            performSearch();
        });
        
        suggestionsContainer.appendChild(suggestionItem);
    });
}

async function performSearch() {
    // Display loading state
    searchResults.innerHTML = '<div class="loading">Loading results...</div>';
    resultsStats.innerHTML = '';
    
    // Construct the Solr query URL with improved highlighting and paragraph-level searching
    let url = `${SOLR_URL}/select?q=${encodeURIComponent(currentQuery)}&start=${currentPage * ROWS_PER_PAGE}&rows=${ROWS_PER_PAGE}`;
    
    // Enhanced highlighting for paragraphs
    url += '&hl=on&hl.fl=content,paragraph_text&hl.snippets=3&hl.fragsize=150';
    url += '&hl.simple.pre=<mark>&hl.simple.post=</mark>';
    url += '&hl.maxAnalyzedChars=251000';
    
    // Add faceting
    url += '&facet=on&facet.field=file_name&facet.mincount=1&facet.limit=20';
     
    // Group results by file name to consolidate related paragraphs
    url += '&group=true&group.field=file_name&group.limit=10';
    
    // Add filter queries for selected facets
    if (selectedFacets.category && selectedFacets.category.length > 0) {
        selectedFacets.category.forEach(category => {
            url += `&fq=category:"${encodeURIComponent(category)}"`;
        });
    }
    
    if (selectedFacets.tags && selectedFacets.tags.length > 0) {
        selectedFacets.tags.forEach(tag => {
            url += `&fq=tags:"${encodeURIComponent(tag)}"`;
        });
    }
    
    // Add JSON response format
    url += '&wt=json';
    
    // Measure response time
    const startTime = performance.now();
    
    try {
        console.log(`Fetching ${url}`);
        const response = await fetch(url);
        const data = await response.json();
        
        // Calculate response time
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        if (responseTimeElement) {
            responseTimeElement.textContent = responseTime;
        }
        
        // Render results with improved highlighting
        renderEnhancedResults(data);
        
        // Render facets if they exist
        if (data.facet_counts && data.facet_counts.facet_fields) {
            renderFacets(data.facet_counts.facet_fields);
        }
        
        // Render pagination based on total results
        if (data.grouped && data.grouped.file_name) {
            renderPagination(data.grouped.file_name.matches);
        } else if (data.response) {
            renderPagination(data.response.numFound);
        }
    } catch (error) {
        console.error('Error performing search:', error);
        searchResults.innerHTML = '<div class="error">An error occurred while searching. Please try again.</div>';
    }
}

function renderEnhancedResults(data) {
    // Check if we have grouped results
    if (data.grouped && data.grouped.file_name) {
        renderGroupedResults(data);
    } else {
        renderStandardResults(data);
    }
}

function renderGroupedResults(data) {
    const { grouped, highlighting } = data;
    const groups = grouped.file_name.groups;
    const totalMatches = grouped.file_name.matches;
    
    // Update results stats
    if (resultsStats) {
        resultsStats.innerHTML = `Found ${totalMatches} results for <strong>"${escapeHtml(currentQuery)}"</strong>`;
    }
    
    if (groups.length === 0) {
        searchResults.innerHTML = '<div class="no-results">No results found. Please try a different search query.</div>';
        return;
    }
    
    // Clear previous results
    searchResults.innerHTML = '';
    
    // Process each file group
    groups.forEach(group => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-result';
        
        const fileName = group.groupValue;
        
        // Create file header
        const fileHeader = document.createElement('h3');
        fileHeader.className = 'file-name';
        fileHeader.textContent = fileName;
        fileDiv.appendChild(fileHeader);
        
        // Get docs for this file
        const docs = group.doclist.docs;
        
        // Sort by page number and paragraph number
        docs.sort((a, b) => {
            if ((a.page_number || 0) !== (b.page_number || 0)) {
                return (a.page_number || 0) - (b.page_number || 0);
            }
            return (a.paragraph_number || 0) - (b.paragraph_number || 0);
        });
        
        // Track which pages we've already created headers for
        const pageHeaderCreated = {};
        
        // Process each document (paragraph)
        docs.forEach(doc => {
            // Create page header if available and not already created
            if (doc.page_number && !pageHeaderCreated[doc.page_number]) {
                const pageHeader = document.createElement('h4');
                pageHeader.className = 'page-header';
                pageHeader.textContent = `Page ${doc.page_number}`;
                fileDiv.appendChild(pageHeader);
                pageHeaderCreated[doc.page_number] = true;
            }
            
            // Create snippet container
            const snippetDiv = document.createElement('div');
            snippetDiv.className = 'result-snippet';
            
            // Get highlighted content
            const docHighlights = highlighting[doc.id];
            let highlightedContent = '';
            
            if (docHighlights && docHighlights.paragraph_text && docHighlights.paragraph_text.length > 0) {
                highlightedContent = docHighlights.paragraph_text.join('... ');
            } else if (docHighlights && docHighlights.content && docHighlights.content.length > 0) {
                highlightedContent = docHighlights.content.join('... ');
            } else {
                // Fallback to showing raw paragraph text with manual highlighting
                highlightedContent = doc.paragraph_text || doc.content || '';
                
                // Apply simple highlighting if we have content
                if (highlightedContent) {
                    const regex = new RegExp('(' + escapeRegExp(currentQuery) + ')', 'gi');
                    highlightedContent = highlightedContent.replace(regex, '<mark>$1</mark>');
                }
            }
            
            // Show paragraph number if available
            if (doc.paragraph_number) {
                const paraNum = document.createElement('span');
                paraNum.className = 'paragraph-number';
                paraNum.textContent = `¶${doc.paragraph_number}: `;
                snippetDiv.appendChild(paraNum);
            }
            
            // Add content with highlighting
            const contentSpan = document.createElement('span');
            contentSpan.className = 'snippet-content';
            contentSpan.innerHTML = highlightedContent;
            snippetDiv.appendChild(contentSpan);
            
            fileDiv.appendChild(snippetDiv);
        });
        
        searchResults.appendChild(fileDiv);
    });
}

function renderStandardResults(data) {
    const { response, highlighting } = data;
    const { numFound, docs } = response;
    
    // Update results stats
    if (resultsStats) {
        resultsStats.innerHTML = `Found ${numFound} results for <strong>"${escapeHtml(currentQuery)}"</strong>`;
    }
    
    if (docs.length === 0) {
        searchResults.innerHTML = '<div class="no-results">No results found. Please try a different search query.</div>';
        return;
    }
    
    // Clear previous results
    searchResults.innerHTML = '';
    
    // Group results by file
    const fileResults = {};
    docs.forEach(doc => {
        const fileName = doc.file_name || doc.id;
        if (!fileResults[fileName]) {
            fileResults[fileName] = [];
        }
        fileResults[fileName].push(doc);
    });
    
    // Display results grouped by file
    Object.keys(fileResults).forEach(fileName => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-result';
        
        const fileHeader = document.createElement('h3');
        fileHeader.className = 'file-name';
        fileHeader.textContent = fileName;
        fileDiv.appendChild(fileHeader);
        
        // Sort by page number and paragraph number
        fileResults[fileName].sort((a, b) => {
            if ((a.page_number || 0) !== (b.page_number || 0)) {
                return (a.page_number || 0) - (b.page_number || 0);
            }
            return (a.paragraph_number || 0) - (b.paragraph_number || 0);
        });
        
        // Track which pages we've already created headers for
        const pageHeaderCreated = {};
        
        fileResults[fileName].forEach(doc => {
            // Create page header if available and not already created
            if (doc.page_number && !pageHeaderCreated[doc.page_number]) {
                const pageHeader = document.createElement('h4');
                pageHeader.className = 'page-header';
                pageHeader.textContent = `Page ${doc.page_number}`;
                fileDiv.appendChild(pageHeader);
                pageHeaderCreated[doc.page_number] = true;
            }
            
            const snippetDiv = document.createElement('div');
            snippetDiv.className = 'result-snippet';
            
            // Get highlighted content
            const docHighlights = highlighting[doc.id];
            let highlightedContent = '';
            
            if (docHighlights && docHighlights.paragraph_text && docHighlights.paragraph_text.length > 0) {
                highlightedContent = docHighlights.paragraph_text.join('... ');
            } else if (docHighlights && docHighlights.content && docHighlights.content.length > 0) {
                highlightedContent = docHighlights.content.join('... ');
            } else {
                // Fallback to showing raw paragraph text with manual highlighting
                highlightedContent = doc.paragraph_text || doc.content || '';
                
                // Apply simple highlighting if we have content
                if (highlightedContent) {
                    const regex = new RegExp('(' + escapeRegExp(currentQuery) + ')', 'gi');
                    highlightedContent = highlightedContent.replace(regex, '<mark>$1</mark>');
                }
            }
            
            // Show paragraph number if available
            if (doc.paragraph_number) {
                const paraNum = document.createElement('span');
                paraNum.className = 'paragraph-number';
                paraNum.textContent = `¶${doc.paragraph_number}: `;
                snippetDiv.appendChild(paraNum);
            }
            
            // Add content with highlighting
            const contentSpan = document.createElement('span');
            contentSpan.className = 'snippet-content';
            contentSpan.innerHTML = highlightedContent;
            snippetDiv.appendChild(contentSpan);
            
            fileDiv.appendChild(snippetDiv);
        });
        
        searchResults.appendChild(fileDiv);
    });
}

function renderFacets(facetFields) {
    // Render category facets if available
    if (categoryFacets && facetFields.category) {
        renderFacetGroup(facetFields.category, categoryFacets, 'category');
    }
    
    // Render tags facets if available
    if (tagsFacets && facetFields.tags) {
        renderFacetGroup(facetFields.tags, tagsFacets, 'tags');
    }
}

function renderFacetGroup(facetData, container, facetName) {
    container.innerHTML = '';
    
    // Convert array of [value, count, value, count, ...] to array of objects
    const facets = [];
    for (let i = 0; i < facetData.length; i += 2) {
        facets.push({
            value: facetData[i],
            count: facetData[i + 1]
        });
    }
    
    facets.forEach(facet => {
        const facetItem = document.createElement('div');
        facetItem.className = 'facet-item';
        
        const label = document.createElement('label');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = facet.value;
        checkbox.checked = selectedFacets[facetName] && selectedFacets[facetName].includes(facet.value);
        
        checkbox.addEventListener('change', () => {
            if (!selectedFacets[facetName]) {
                selectedFacets[facetName] = [];
            }
            
            if (checkbox.checked) {
                selectedFacets[facetName].push(facet.value);
            } else {
                selectedFacets[facetName] = selectedFacets[facetName].filter(v => v !== facet.value);
            }
            
            currentPage = 0;
            performSearch();
        });
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${facet.value}`));
        
        const count = document.createElement('span');
        count.className = 'facet-count';
        count.textContent = `(${facet.count})`;
        label.appendChild(count);
        
        facetItem.appendChild(label);
        container.appendChild(facetItem);
    });
}

function renderPagination(totalResults) {
    pagination.innerHTML = '';
    
    const totalPages = Math.ceil(totalResults / ROWS_PER_PAGE);
    
    if (totalPages <= 1) {
        return;
    }
    
    // Previous button
    if (currentPage > 0) {
        const prevButton = createPaginationButton('Previous', () => {
            currentPage--;
            performSearch();
            window.scrollTo(0, 0);
        });
        pagination.appendChild(prevButton);
    }
    
    // Page numbers
    const maxPageButtons = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPageButtons - 1);
    
    if (endPage - startPage < maxPageButtons - 1) {
        startPage = Math.max(0, endPage - maxPageButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createPaginationButton(i + 1, () => {
            currentPage = i;
            performSearch();
            window.scrollTo(0, 0);
        }, i === currentPage);
        
        pagination.appendChild(pageButton);
    }
    
    // Next button
    if (currentPage < totalPages - 1) {
        const nextButton = createPaginationButton('Next', () => {
            currentPage++;
            performSearch();
            window.scrollTo(0, 0);
        });
        pagination.appendChild(nextButton);
    }
}

function createPaginationButton(text, onClick, isActive = false) {
    const button = document.createElement('button');
    button.className = 'pagination-button';
    if (isActive) {
        button.classList.add('active');
    }
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
}

// Helper functions
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}