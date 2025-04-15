# Solr Benchmark Summary Report

Generated on: 2025-04-15 16:24:16

Target Solr URL: 
Benchmark timestamp: 2025-04-15T10:53:19Z

## Performance Summary

| Concurrent Users | Response Time (s) | Transaction Rate | Availability (%) | Success | Failures |
|------------------|------------------|-----------------|-----------------|---------|----------|
| 1 | 0.1 | 9.46 | 100.0 | 14 | 0 |
| 5 | 0.16 | 29.23 | 100.0 | 57 | 0 |
| 10 | 0.24 | 39.29 | 100.0 | 77 | 0 |
| 25 | 0.53 | 41.54 | 100.0 | 81 | 0 |
| 50 | 1.08 | 32.47 | 100.0 | 63 | 0 |
| 100 | 0.0 | 0.0 | 0.0 | 0 | 0 |

## Key Findings

- Best response time: 0.0s at 100 concurrent users
- Maximum transaction rate: 41.54 tps at 25 concurrent users
- **Warning**: Availability dropped below 99.5% in some test scenarios

## Visualization Files

- response_time_{timestamp}.png - Response time vs concurrent users
- transaction_rate_{timestamp}.png - Transaction rate vs concurrent users
- availability_{timestamp}.png - Availability vs concurrent users
- success_failure_{timestamp}.png - Successful vs failed transactions
- combined_metrics_{timestamp}.png - Combined performance metrics
