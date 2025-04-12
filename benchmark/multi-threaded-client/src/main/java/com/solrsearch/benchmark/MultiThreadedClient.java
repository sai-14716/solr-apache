package com.solrsearch.benchmark;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class MultiThreadedClient {
    
    private static final String[] QUERIES = {
        "sample", "document", "test", "example", "author", 
        "category", "tag", "content", "purpose", "functionality"
    };
    
    private static final String SOLR_URL = "http://localhost:8983/solr/searchcore/select?q=";
    private static final Random RANDOM = new Random();
    
    public static void main(String[] args) {
        if (args.length < 3) {
            System.out.println("Usage: java MultiThreadedClient <concurrencyLevel> <testDurationSeconds> <outputFile>");
            System.exit(1);
        }
        
        int concurrencyLevel = Integer.parseInt(args[0]);
        int testDuration = Integer.parseInt(args[1]);
        String outputFile = args[2];
        
        runBenchmark(concurrencyLevel, testDuration, outputFile);
    }
    
    public static void runBenchmark(int concurrencyLevel, int testDuration, String outputFile) {
        System.out.println("Starting benchmark with concurrency level: " + concurrencyLevel);
        System.out.println("Test duration: " + testDuration + " seconds");
        
        ExecutorService executor = Executors.newFixedThreadPool(concurrencyLevel);
        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .executor(executor)
            .build();
        
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        List<Long> responseTimes = new ArrayList<>();
        
        Instant startTime = Instant.now();
        Instant endTime = startTime.plusSeconds(testDuration);
        
        while (Instant.now().isBefore(endTime)) {
            List<CompletableFuture<Void>> futures = new ArrayList<>();
            
            for (int i = 0; i < concurrencyLevel; i++) {
                CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                    String query = QUERIES[RANDOM.nextInt(QUERIES.length)];
                    String url = SOLR_URL + query;
                    
                    HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .GET()
                        .build();
                    
                    Instant requestStart = Instant.now();
                    try {
                        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                        if (response.statusCode() == 200) {
                            successCount.incrementAndGet();
                        } else {
                            failureCount.incrementAndGet();
                        }
                        
                        long responseTime = Duration.between(requestStart, Instant.now()).toMillis();
                        synchronized (responseTimes) {
                            responseTimes.add(responseTime);
                        }
                    } catch (IOException | InterruptedException e) {
                        failureCount.incrementAndGet();
                    }
                }, executor);
                
                futures.add(future);
            }
            
            // Wait for all requests to complete
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
            
            // Add a small delay to avoid overwhelming the system
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        
        Instant actualEndTime = Instant.now();
        long actualDuration = Duration.between(startTime, actualEndTime).getSeconds();
        
        // Calculate results
        int totalRequests = successCount.get() + failureCount.get();
        double qps = (double) totalRequests / actualDuration;
        
        double avgResponseTime = responseTimes.stream()
            .mapToLong(Long::longValue)
            .average()
            .orElse(0.0) / 1000.0; // Convert to seconds
        
        // Print results
        System.out.println("Benchmark completed!");
        System.out.println("Total duration: " + actualDuration + " seconds");
        System.out.println("Total requests: " + totalRequests);
        System.out.println("Successful requests: " + successCount.get());
        System.out.println("Failed requests: " + failureCount.get());
        System.out.println("QPS (Queries Per Second): " + qps);
        System.out.println("Average response time: " + avgResponseTime + " seconds");
        
        // Save results to file
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(outputFile))) {
            writer.write("Concurrency Level: " + concurrencyLevel + "\n");
            writer.write("Test Duration: " + actualDuration + " seconds\n");
            writer.write("Total Requests: " + totalRequests + "\n");
            writer.write("Successful Requests: " + successCount.get() + "\n");
            writer.write("Failed Requests: " + failureCount.get() + "\n");
            writer.write("QPS (Queries Per Second): " + qps + "\n");
            writer.write("Average Response Time: " + avgResponseTime + " seconds\n");
        } catch (IOException e) {
            System.err.println("Error writing results to file: " + e.getMessage());
        }
        
        // Shutdown executor
        executor.shutdown();
        try {
            if (!executor.awaitTermination(30, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}