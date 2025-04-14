#!/bin/bash
# Modified siege-benchmark.sh to produce structured output for visualization

# Check if SOLR_URL is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <SOLR_URL>"
  echo "Example: $0 http://localhost:8983/solr"
  exit 1
fi

SOLR_URL=http://localhost:8983/solr/searchcore
OUTPUT_DIR="./benchmark_results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="${OUTPUT_DIR}/siege_results_${TIMESTAMP}.json"

# Create output directory if it doesn't exist
mkdir -p $OUTPUT_DIR

# Array of concurrent users to test
CONCURRENT_USERS=(1 5 10 25 50 100)
# Test duration in seconds
DURATION=2

echo "Starting benchmark tests against $SOLR_URL"
echo "Results will be saved to $OUTPUT_FILE"

# Initialize JSON output - write to a temporary file first
TEMP_FILE="${OUTPUT_DIR}/temp_results_${TIMESTAMP}.json"

echo "{" > $TEMP_FILE
echo "  \"benchmark_timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> $TEMP_FILE
echo "  \"solr_url\": \"$SOLR_URL\"," >> $TEMP_FILE
echo "  \"results\": [" >> $TEMP_FILE

first_entry=true

for USERS in "${CONCURRENT_USERS[@]}"; do
  echo "Running test with $USERS concurrent users for $DURATION seconds..."
  
  # Run siege and capture output
  SIEGE_OUTPUT=$(siege -c $USERS -t${DURATION}S -b "$SOLR_URL/select?q=TCP")
  
  # Extract key metrics using grep and awk, and ensure they're clean numbers
  TRANSACTIONS=$(echo "$SIEGE_OUTPUT" | grep "Transactions:" | awk '{print $2}' | tr -d ',')
  AVAILABILITY=$(echo "$SIEGE_OUTPUT" | grep "Availability:" | awk '{print $2}' | tr -d '%,')
  ELAPSED_TIME=$(echo "$SIEGE_OUTPUT" | grep "Elapsed time:" | awk '{print $3}' | tr -d ',')
  RESPONSE_TIME=$(echo "$SIEGE_OUTPUT" | grep "Response time:" | awk '{print $3}' | tr -d ',')
  TRANSACTION_RATE=$(echo "$SIEGE_OUTPUT" | grep "Transaction rate:" | awk '{print $3}' | tr -d ',')
  THROUGHPUT=$(echo "$SIEGE_OUTPUT" | grep "Throughput:" | awk '{print $2}' | tr -d ',')
  CONCURRENCY=$(echo "$SIEGE_OUTPUT" | grep "Concurrency:" | awk '{print $2}' | tr -d ',')
  SUCCESSFUL_TRANSACTIONS=$(echo "$SIEGE_OUTPUT" | grep "Successful transactions:" | awk '{print $3}' | tr -d ',')
  FAILED_TRANSACTIONS=$(echo "$SIEGE_OUTPUT" | grep "Failed transactions:" | awk '{print $3}' | tr -d ',')
  
  # Check if any values are empty and set to 0 if they are
  TRANSACTIONS=${TRANSACTIONS:-0}
  AVAILABILITY=${AVAILABILITY:-0}
  ELAPSED_TIME=${ELAPSED_TIME:-0}
  RESPONSE_TIME=${RESPONSE_TIME:-0}
  TRANSACTION_RATE=${TRANSACTION_RATE:-0}
  THROUGHPUT=${THROUGHPUT:-0}
  CONCURRENCY=${CONCURRENCY:-0}
  SUCCESSFUL_TRANSACTIONS=${SUCCESSFUL_TRANSACTIONS:-0}
  FAILED_TRANSACTIONS=${FAILED_TRANSACTIONS:-0}
  
  # Add comma separator if not the first entry
  if [ "$first_entry" = true ]; then
    first_entry=false
  else
    echo "    ," >> $TEMP_FILE
  fi
  
  # Add result entry to JSON - ensure all values are proper numbers
  cat << EOF >> $TEMP_FILE
    {
      "concurrent_users": $USERS,
      "duration_seconds": $DURATION,
      "transactions": $TRANSACTIONS,
      "availability": $AVAILABILITY,
      "elapsed_time": $ELAPSED_TIME,
      "response_time": $RESPONSE_TIME,
      "transaction_rate": $TRANSACTION_RATE,
      "throughput": $THROUGHPUT,
      "concurrency": $CONCURRENCY,
      "successful_transactions": $SUCCESSFUL_TRANSACTIONS,
      "failed_transactions": $FAILED_TRANSACTIONS
    }
EOF

  # Short pause between tests
  sleep 2
done

# Finish JSON structure
echo "  ]" >> $TEMP_FILE
echo "}" >> $TEMP_FILE

# Validate the JSON before finalizing
if command -v jq &> /dev/null; then
    # If jq is available, use it to validate and prettify
    jq . $TEMP_FILE > $OUTPUT_FILE
    if [ $? -ne 0 ]; then
        echo "ERROR: Generated JSON is invalid. Check the temp file at $TEMP_FILE"
        exit 1
    fi
else
    # If jq is not available, just move the temp file
    mv $TEMP_FILE $OUTPUT_FILE
fi

echo "Benchmark complete. Results saved to $OUTPUT_FILE"
echo "You can now visualize these results with: python visualize-results.py $OUTPUT_FILE"

# Echo the content of the JSON file for debugging
echo "JSON file content preview:"
head -n 20 $OUTPUT_FILE