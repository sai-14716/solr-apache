# Solr Benchmark Summary Report

Generated on: 2025-04-19 01:22:48

Target Solr URL: 
Benchmark timestamp: 2025-04-18T19:43:47Z

## Performance Summary

| Concurrent Users | Response Time (s) | Transaction Rate | Availability (%) | Success | Failures |
|------------------|------------------|-----------------|-----------------|---------|----------|
| 2 | 0.0 | 845.54 | 100.0 | 7779 | 0 |
| 3 | 0.0 | 1773.47 | 100.0 | 17646 | 0 |
| 5 | 0.0 | 1989.45 | 100.0 | 19795 | 0 |
| 7 | 0.0 | 3695.98 | 100.0 | 36738 | 0 |
| 11 | 0.0 | 4462.45 | 100.0 | 44446 | 0 |
| 13 | 0.0 | 4166.87 | 100.0 | 41502 | 0 |
| 17 | 0.0 | 4212.75 | 100.0 | 41960 | 0 |
| 19 | 0.0 | 4078.31 | 100.0 | 40621 | 0 |
| 23 | 0.01 | 4249.85 | 100.0 | 42286 | 0 |
| 29 | 0.01 | 3808.04 | 100.0 | 37890 | 0 |
| 31 | 0.01 | 3802.41 | 100.0 | 37834 | 0 |
| 37 | 0.01 | 3778.49 | 100.0 | 37596 | 0 |
| 41 | 0.01 | 3816.48 | 100.0 | 37974 | 0 |
| 43 | 0.01 | 3754.12 | 100.0 | 37316 | 0 |
| 47 | 0.01 | 3436.85 | 100.0 | 34233 | 0 |
| 51 | 0.01 | 3883.82 | 100.0 | 38644 | 0 |
| 53 | 0.01 | 3834.27 | 100.0 | 38151 | 0 |
| 57 | 0.02 | 3638.03 | 100.0 | 36163 | 0 |
| 59 | 0.02 | 3327.28 | 100.0 | 33173 | 0 |
| 61 | 0.02 | 3283.6 | 100.0 | 32640 | 0 |
| 67 | 0.02 | 3793.27 | 100.0 | 37743 | 0 |
| 71 | 0.02 | 3797.79 | 100.0 | 37788 | 0 |

## Key Findings

- Best response time: 0.0s at 2 concurrent users
- Maximum transaction rate: 4462.45 tps at 11 concurrent users
- **Scaling concern**: Response time increased significantly at higher concurrency levels

## Visualization Files

- response_time_{timestamp}.png - Response time vs concurrent users
- transaction_rate_{timestamp}.png - Transaction rate vs concurrent users
- availability_{timestamp}.png - Availability vs concurrent users
- success_failure_{timestamp}.png - Successful vs failed transactions
- combined_metrics_{timestamp}.png - Combined performance metrics
