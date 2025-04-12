# Project: Scalable Cloud-Based Text Search Engine using Flask & SolrCloud

from flask import Flask, render_template, request, redirect, send_file, jsonify
import os
import csv
import requests
import shutil
from werkzeug.utils import secure_filename
from crawler import crawl_urls
from utils import index_documents, search_query

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return 'No file part', 400
    file = request.files['file']
    if file.filename == '':
        return 'No selected file', 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        index_documents([filepath])
        return 'File uploaded and indexed successfully', 200
    return 'Invalid file type', 400

@app.route('/crawl', methods=['POST'])
def crawl():
    data = request.json
    urls = data.get('urls', [])
    if not urls:
        return 'No URLs provided', 400
    crawled_files = crawl_urls(urls)
    index_documents(crawled_files)
    return 'Crawling and indexing complete', 200

@app.route('/search')
def search():
    query = request.args.get('q', '')
    if not query:
        return 'No query provided', 400
    results = search_query(query)
    return render_template('results.html', query=query, results=results)

@app.route('/dashboard')
def dashboard():
    qps_data = []
    try:
        with open('qps_results.csv', newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                qps_data.append({'timestamp': row['timestamp'], 'qps': float(row['qps'])})
    except FileNotFoundError:
        qps_data = []
    return render_template('dashboard.html', data=qps_data)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

if __name__ == '__main__':
    app.run(debug=True)
