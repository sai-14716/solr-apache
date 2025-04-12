import os
import requests
import json
from PyPDF2 import PdfReader

SOLR_CORE_URL = 'http://localhost:8983/solr/tech_products'

# Index a list of file paths to Solr

def index_documents(file_paths):
    for file_path in file_paths:
        try:
            if file_path.endswith('.pdf'):
                content = extract_pdf_text(file_path)
            else:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

            doc = {
                'id': os.path.basename(file_path),
                'content_txt': content
            }

            headers = {'Content-Type': 'application/json'}
            response = requests.post(f"{SOLR_CORE_URL}/update?commit=true", headers=headers, data=json.dumps([doc]))
            print(f"Indexed {file_path}: {response.status_code}")

        except Exception as e:
            print(f"Error indexing {file_path}: {e}")

def extract_pdf_text(path):
    try:
        reader = PdfReader(path)
        return "\n".join([page.extract_text() or "" for page in reader.pages])
    except Exception as e:
        print(f"Failed to extract PDF text: {e}")
        return ""


# Search in Solr for a given query

def search_query(query):
    params = {
        'q': f'content_txt:{query}',
        'wt': 'json'
    }
    try:
        response = requests.get(f"{SOLR_CORE_URL}/select", params=params)
        docs = response.json()['response']['docs']
        return docs
    except Exception as e:
        print(f"Search error: {e}")
        return []
