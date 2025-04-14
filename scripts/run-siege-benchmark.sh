#!/bin/bash
# run-siege-benchmark.sh - Script to run benchmarks using Siege

BASE_DIR=$(pwd)
RESULTS_DIR="$BASE_DIR/benchmark/results"
URLS_FILE="$BASE_DIR/benchmark/siege-config/urls.txt"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create results directory
mkdir -p $RESULTS_DIR

# Check if Siege is installed
if ! command -v siege &> /dev/null; then
    echo "Siege is not installed. Please install it first."
    exit 1
fi

echo "$BASE_DIR"
echo "$RESULTS_DIR"
echo "$URLS_FILE"


# Run tests with different concurrency levels
for CONCURRENCY in 1, 5, 10, 100; do
    echo "Running benchmark with concurrency level: $CONCURRENCY"
    RESULTS_FILE="$RESULTS_DIR/siege_results_${CONCURRENCY}_${TIMESTAMP}.txt"
    
    # Run siege for 60 seconds
    siege -c $CONCURRENCY -D -t 60S -f $URLS_FILE -q -l -m "$RESULTS_FILE.log" > $RESULTS_FILE
    
    # Extract the QPS (transactions per second)
    QPS=$(grep "Transaction rate:" $RESULTS_FILE | awk '{print $3}')
    RESPONSE_TIME=$(grep "Response time:" $RESULTS_FILE | awk '{print $3}')
    
    echo "Concurrency: $CONCURRENCY, QPS: $QPS, Avg Response Time: $RESPONSE_TIME seconds"
    echo "$CONCURRENCY,$QPS,$RESPONSE_TIME" >> "$RESULTS_DIR/qps_summary_${TIMESTAMP}.csv"
done

echo "Benchmarking complete! Results saved in $RESULTS_DIR" 