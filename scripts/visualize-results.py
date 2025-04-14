#!/usr/bin/env python3
"""
visualize.py - Visualization tool for Solr search benchmark results
"""

import os
import json
import argparse
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.ticker import MaxNLocator

def load_benchmark_data(file_path):
    """Load benchmark data from JSON file"""
    with open(file_path, 'r') as f:
        data = json.load(f)
    return data

def create_dataframe(data):
    """Convert benchmark data to pandas DataFrame"""
    df = pd.DataFrame(data)
    
    # Calculate QPS for each test if not already present
    if 'qps' not in df.columns and 'totalQueries' in df.columns and 'totalTimeMs' in df.columns:
        df['qps'] = (df['totalQueries'] / (df['totalTimeMs'] / 1000)).round(2)
    
    return df

def plot_qps_by_threads(df, output_dir):
    """Create QPS vs Thread Count plot"""
    plt.figure(figsize=(12, 8))
    sns.set_style("whitegrid")
    
    # For multiple connection counts, create different lines
    if 'connectionCount' in df.columns:
        for conn, group in df.groupby('connectionCount'):
            sns.lineplot(
                x='threadCount', 
                y='qps', 
                data=group, 
                marker='o',
                linewidth=2.5,
                label=f'Connections: {conn}'
            )
    else:
        sns.lineplot(
            x='threadCount', 
            y='qps', 
            data=df, 
            marker='o',
            linewidth=2.5
        )
    
    plt.title('Query Performance Scaling by Thread Count', fontsize=16)
    plt.xlabel('Thread Count', fontsize=14)
    plt.ylabel('Queries Per Second (QPS)', fontsize=14)
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'qps_by_threads.png'), dpi=300)
    plt.close()

def plot_response_time_distribution(df, output_dir):
    """Create response time distribution histogram"""
    if 'responseTimes' not in df.columns:
        print("No response time data available for distribution plot")
        return
    
    # Flatten response times from all tests
    all_times = []
    for times in df['responseTimes']:
        all_times.extend(times)
    
    plt.figure(figsize=(12, 8))
    sns.histplot(all_times, kde=True, bins=30)
    plt.title('Response Time Distribution', fontsize=16)
    plt.xlabel('Response Time (ms)', fontsize=14)
    plt.ylabel('Frequency', fontsize=14)
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'response_time_dist.png'), dpi=300)
    plt.close()

def plot_latency_percentiles(df, output_dir):
    """Create latency percentiles plot"""
    if 'p50Latency' not in df.columns or 'p95Latency' not in df.columns or 'p99Latency' not in df.columns:
        print("No latency percentile data available for plotting")
        return
    
    plt.figure(figsize=(12, 8))
    
    # For multiple thread counts
    for threads, group in df.groupby('threadCount'):
        x = list(range(len(group)))
        plt.plot(x, group['p50Latency'], 'o-', label=f'Thread {threads} - P50', linewidth=2)
        plt.plot(x, group['p95Latency'], 's-', label=f'Thread {threads} - P95', linewidth=2)
        plt.plot(x, group['p99Latency'], '^-', label=f'Thread {threads} - P99', linewidth=2)
    
    plt.title('Latency Percentiles by Test Configuration', fontsize=16)
    plt.xlabel('Test Run', fontsize=14)
    plt.ylabel('Latency (ms)', fontsize=14)
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'latency_percentiles.png'), dpi=300)
    plt.close()

def plot_error_rate(df, output_dir):
    """Create error rate plot"""
    if 'errorCount' not in df.columns or 'totalQueries' not in df.columns:
        print("No error data available for plotting")
        return
    
    df['errorRate'] = (df['errorCount'] / df['totalQueries'] * 100).round(2)
    
    plt.figure(figsize=(12, 8))
    sns.barplot(x='threadCount', y='errorRate', data=df)
    plt.title('Error Rate by Thread Count', fontsize=16)
    plt.xlabel('Thread Count', fontsize=14)
    plt.ylabel('Error Rate (%)', fontsize=14)
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'error_rate.png'), dpi=300)
    plt.close()

def generate_html_report(df, output_dir, plots):
    """Generate HTML report with benchmark results and plots"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Solr Search Benchmark Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .plot-container { margin: 20px 0; }
            .plot-container img { max-width: 100%; box-shadow: 0 0 5px rgba(0,0,0,0.1); }
        </style>
    </head>
    <body>
        <h1>Solr Search Benchmark Report</h1>
        
        <h2>Benchmark Summary</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Total Test Runs</td>
                <td>{total_runs}</td>
            </tr>
            <tr>
                <td>Max QPS Achieved</td>
                <td>{max_qps:.2f}</td>
            </tr>
            <tr>
                <td>Avg QPS</td>
                <td>{avg_qps:.2f}</td>
            </tr>
            <tr>
                <td>Thread Configuration at Max QPS</td>
                <td>{max_qps_threads}</td>
            </tr>
        </table>
        
        <h2>Detailed Results</h2>
        <table>
            <tr>
                {table_headers}
            </tr>
            {table_rows}
        </table>
        
        <h2>Performance Visualizations</h2>
        
    """.format(
        total_runs=len(df),
        max_qps=df['qps'].max(),
        avg_qps=df['qps'].mean(),
        max_qps_threads=df.loc[df['qps'].idxmax()]['threadCount'] if 'threadCount' in df.columns else 'N/A',
        table_headers=''.join(f'<th>{col}</th>' for col in df.columns),
        table_rows=''.join(
            '<tr>' + ''.join(f'<td>{row[col]}</td>' for col in df.columns) + '</tr>'
            for _, row in df.iterrows()
        )
    )
    
    # Add plot images
    for plot in plots:
        plot_filename = os.path.basename(plot)
        html_content += f"""
        <div class="plot-container">
            <h3>{plot_filename.replace('.png', '').replace('_', ' ').title()}</h3>
            <img src="{plot_filename}" alt="{plot_filename}" />
        </div>
        """
    
    html_content += """
    </body>
    </html>
    """
    
    with open(os.path.join(output_dir, 'benchmark_report.html'), 'w') as f:
        f.write(html_content)

def main():
    parser = argparse.ArgumentParser(description='Visualize Solr search benchmark results')
    parser.add_argument('input', help='Input JSON file with benchmark data')
    parser.add_argument('--output-dir', default='./benchmark_results', help='Output directory for visualizations')
    args = parser.parse_args()
    
    # Create output directory if it doesn't exist
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Load and process data
    data = load_benchmark_data(args.input)
    df = create_dataframe(data)
    
    # Generate plots
    plots = []
    
    try:
        plot_qps_by_threads(df, args.output_dir)
        plots.append(os.path.join(args.output_dir, 'qps_by_threads.png'))
    except Exception as e:
        print(f"Error generating QPS plot: {e}")
    
    try:
        plot_response_time_distribution(df, args.output_dir)
        plots.append(os.path.join(args.output_dir, 'response_time_dist.png'))
    except Exception as e:
        print(f"Error generating response time distribution: {e}")
    
    try:
        plot_latency_percentiles(df, args.output_dir)
        plots.append(os.path.join(args.output_dir, 'latency_percentiles.png'))
    except Exception as e:
        print(f"Error generating latency percentiles: {e}")
    
    try:
        plot_error_rate(df, args.output_dir)
        plots.append(os.path.join(args.output_dir, 'error_rate.png'))
    except Exception as e:
        print(f"Error generating error rate plot: {e}")
    
    # Generate HTML report
    generate_html_report(df, args.output_dir, [os.path.basename(p) for p in plots])
    
    print(f"Visualization complete. Results saved to {args.output_dir}")
    print(f"Open {os.path.join(args.output_dir, 'benchmark_report.html')} to view the report")

if __name__ == "__main__":
    main()