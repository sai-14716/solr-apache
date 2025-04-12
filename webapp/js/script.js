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
const categoryFacets = document.getElementById('category-facets').querySelector('.facet-items');
const tagsFacets = document.getElementById('tags-facets').querySelector('.facet-items');
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
    searchInput.addEventListener('input', debounce(handleSuggestions, 300));
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!suggestionsContainer.contains(e.target) && e.target !== searchInput) {
            suggestionsContainer.style.display = 'none';
        }
    });
    
    // Handle search form submission
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        currentQuery = searchInput.value.trim();
        currentPage = 0;
        if (currentQuery) {
            performSearch();
        }
    });
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
    
    // Construct the Solr query URL with facets and filters
    let url = `${SOLR_URL}/select?q=${encodeURIComponent(currentQuery)}&start=${currentPage * ROWS_PER_PAGE}&rows=${ROWS_PER_PAGE}`;
    
    // Add highlighting
    url += '&hl=on&hl.fl=title,content&hl.snippets=3&hl.fragsize=200';
    
    // Add faceting
    url += '&facet=on&facet.field=category&facet.field=tags&facet.mincount=1&facet.limit=20';
    
    // Add filter queries for selected facets
    if (selectedFacets.category.length > 0) {
        selectedFacets.category.forEach(category => {
            url += `&fq=category:"${encodeURIComponent(category)}"`;
        });
    }
    
    if (selectedFacets.tags.length > 0) {
        selectedFacets.tags.forEach(tag => {
            url += `&fq=tags:"${encodeURIComponent(tag)}"`;
        });
    }
    
    // Add JSON response format
    url += '&wt=json';
    
    // Measure response time
    const startTime = performance.now();
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Calculate response time
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        responseTimeElement.textContent = responseTime;
        
        // Render results, facets, and pagination
        renderResults(data);
        renderFacets(data.facet_counts.facet_fields);
        renderPagination(data.response.numFound);
    } catch (error) {
        console.error('Error performing search:', error);
        searchResults.innerHTML = '<div class="error">An error occurred while searching. Please try again.</div>';
    }
}

function renderResults(data) {
    const { response, highlighting } = data;
    const { numFound, docs } = response;
    
    // Update results stats
    resultsStats.innerHTML = `Found ${numFound} results for <strong>"${escapeHtml(currentQuery)}"</strong>`;
    
    if (docs.length === 0) {
        searchResults.innerHTML = '<div class="no-results">No results found. Please try a different search query.</div>';
        return;
    }
    
    // Clear previous results
    searchResults.innerHTML = '';
    
    // Render each result
    docs.forEach(doc => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        // Title with link
        const title = document.createElement('h2');
        title.className = 'result-title';
        const titleLink = document.createElement('a');
        titleLink.href = doc.url;
        titleLink.target = '_blank';
        
        // Use highlighted title if available, otherwise use the original title
        if (highlighting[doc.id]?.title) {
            titleLink.innerHTML = highlighting[doc.id].title[0];
        } else {
            titleLink.textContent = doc.title;
        }
        
        title.appendChild(titleLink);
        resultItem.appendChild(title);
        
        // Content snippet
        if (highlighting[doc.id]?.content) {
            const snippet = document.createElement('div');
            snippet.className = 'result-snippet';
            snippet.innerHTML = highlighting[doc.id].content.join('... ');
            resultItem.appendChild(snippet);
        } else if (doc.content) {
            const snippet = document.createElement('div');
            snippet.className = 'result-snippet';
            snippet.textContent = truncateText(doc.content, 200);
            resultItem.appendChild(snippet);
        }
        
        // Metadata (categories, tags, etc.)
        const meta = document.createElement('div');
        meta.className = 'result-meta';
        
        // Add categories if available
        if (doc.category && doc.category.length > 0) {
            doc.category.forEach(cat => {
                const category = document.createElement('span');
                category.className = 'result-category';
                category.textContent = cat;
                meta.appendChild(category);
            });
        }
        
        // Add tags if available
        if (doc.tags && doc.tags.length > 0) {
            doc.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'result-tag';
                tagElement.textContent = tag;
                meta.appendChild(tagElement);
            });
        }
        
        resultItem.appendChild(meta);
        searchResults.appendChild(resultItem);
    });
}

function renderFacets(facetFields) {
    // Render category facets
    renderFacetGroup(facetFields.category, categoryFacets, 'category');
    
    // Render tags facets
    renderFacetGroup(facetFields.tags, tagsFacets, 'tags');
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
        checkbox.checked = selectedFacets[facetName].includes(facet.value);
        
        checkbox.addEventListener('change', () => {
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