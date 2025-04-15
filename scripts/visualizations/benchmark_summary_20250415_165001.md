# Solr Benchmark Summary Report

Generated on: 2025-04-15 16:50:03

Target Solr URL: 
Benchmark timestamp: 2025-04-15T11:19:12Z

## Performance Summary

| Concurrent Users | Response Time (s) | Transaction Rate | Availability (%) | Success | Failures |
|------------------|------------------|-----------------|-----------------|---------|----------|
| 1 | 0.12 | 7.81 | 100.0 | 10 | 0 |
| 5 | 0.18 | 27.18 | 100.0 | 53 | 0 |
| 10 | 0.25 | 37.24 | 100.0 | 73 | 0 |
| 25 | 0.58 | 35.2 | 100.0 | 69 | 0 |
| 50 | 1.13 | 28.5 | 100.0 | 55 | 0 |

## Key Findings

- Best response time: 0.12s at 1 concurrent users
- Maximum transaction rate: 37.24 tps at 10 concurrent users
- **Scaling concern**: Response time increased significantly at higher concurrency levels

## Visualization Files

- response_time_{timestamp}.png - Response time vs concurrent users
- transaction_rate_{timestamp}.png - Transaction rate vs concurrent users
- availability_{timestamp}.png - Availability vs concurrent users
- success_failure_{timestamp}.png - Successful vs failed transactions
- combined_metrics_{timestamp}.png - Combined performance metrics
