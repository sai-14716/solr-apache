# Solr Benchmark Summary Report

Generated on: 2025-04-15 16:57:17

Target Solr URL: 
Benchmark timestamp: 2025-04-15T11:22:42Z

## Performance Summary

| Concurrent Users | Response Time (s) | Transaction Rate | Availability (%) | Success | Failures |
|------------------|------------------|-----------------|-----------------|---------|----------|
| 2 | 0.1 | 19.55 | 100.0 | 192 | 0 |
| 3 | 0.14 | 21.79 | 100.0 | 217 | 0 |
| 5 | 0.19 | 26.71 | 100.0 | 266 | 0 |
| 7 | 0.21 | 32.96 | 100.0 | 328 | 0 |
| 11 | 0.25 | 43.17 | 100.0 | 430 | 0 |
| 13 | 0.28 | 45.53 | 100.0 | 453 | 0 |
| 17 | 0.35 | 47.04 | 100.0 | 468 | 0 |
| 19 | 0.4 | 47.08 | 100.0 | 468 | 0 |
| 23 | 0.47 | 47.73 | 100.0 | 474 | 0 |
| 29 | 0.59 | 47.78 | 100.0 | 474 | 0 |
| 31 | 0.63 | 47.88 | 100.0 | 475 | 0 |
| 37 | 0.75 | 47.63 | 100.0 | 473 | 0 |
| 41 | 0.84 | 46.47 | 100.0 | 461 | 0 |
| 43 | 0.86 | 47.43 | 100.0 | 470 | 0 |
| 47 | 0.98 | 44.6 | 100.0 | 442 | 0 |
| 51 | 1.06 | 45.41 | 100.0 | 450 | 0 |
| 53 | 1.05 | 47.53 | 100.0 | 471 | 0 |
| 57 | 1.14 | 46.81 | 100.0 | 463 | 0 |
| 59 | 1.29 | 42.63 | 100.0 | 422 | 0 |
| 61 | 1.23 | 46.22 | 100.0 | 459 | 0 |
| 67 | 1.37 | 45.54 | 100.0 | 449 | 0 |
| 71 | 1.51 | 43.04 | 100.0 | 427 | 0 |

## Key Findings

- Best response time: 0.1s at 2 concurrent users
- Maximum transaction rate: 47.88 tps at 31 concurrent users
- **Scaling concern**: Response time increased significantly at higher concurrency levels

## Visualization Files

- response_time_{timestamp}.png - Response time vs concurrent users
- transaction_rate_{timestamp}.png - Transaction rate vs concurrent users
- availability_{timestamp}.png - Availability vs concurrent users
- success_failure_{timestamp}.png - Successful vs failed transactions
- combined_metrics_{timestamp}.png - Combined performance metrics
