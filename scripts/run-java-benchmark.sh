#!/bin/bash
# run-java-benchmark.sh - Script to compile and run the Java benchmark client

BASE_DIR=$(pwd)
JAVA_SRC_DIR="$BASE_DIR/benchmark/multi-threaded-client/src/main/java"
CLASSES_DIR="$BASE_DIR/benchmark/multi-threaded-client/classes"
RESULTS_DIR="$BASE_DIR/benchmark/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create directories
mkdir -p $CLASSES_DIR
mkdir -p $RESULTS_DIR

# Compile Java code
echo "Compiling Java code..."
javac -d $CLASSES_DIR $JAVA_SRC_DIR/com/solrsearch/benchmark/MultiThreadedClient.java

# Check if compilation was successful
if [ $? -ne 0 ]; then
    echo "Compilation failed."
    exit 1
fi

# Run benchmarks with different concurrency levels
echo "Running benchmarks..."
for CONCURRENCY in 10 20 50 100 200; do
    RESULTS_FILE="$RESULTS_DIR/java_results_${CONCURRENCY}_${TIMESTAMP}.txt"
    
    echo "Running benchmark with concurrency level: $CONCURRENCY"
    java -cp $CLASSES_DIR com.solrsearch.benchmark.MultiThreadedClient $CONCURRENCY 60 $RESULTS_FILE
    
    # Extract QPS from results file
    QPS=$(grep "QPS" $RESULTS_FILE | cut -d ':' -f 2 | tr -d ' ')
    RESPONSE_TIME=$(grep "Average response time" $RESULTS_FILE | cut -d ':' -f 2 | tr -d ' ' | sed 's/seconds//')
    
    echo "Concurrency: $CONCURRENCY, QPS: $QPS, Avg Response Time: $RESPONSE_TIME seconds"
    echo "$CONCURRENCY,$QPS,$RESPONSE_TIME" >> "$RESULTS_DIR/java_qps_summary_${TIMESTAMP}.csv"
done

echo "Java benchmarking complete! Results saved in $RESULTS_DIR"