package com.belfort.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@SpringBootApplication
@RestController
@RequestMapping("/api/analytics")
@EnableScheduling
public class AnalyticsService {
    
    private static final Logger logger = LoggerFactory.getLogger(AnalyticsService.class);
    private final ObjectMapper mapper = new ObjectMapper();
    
    // Performance metrics
    private final AtomicLong totalRequests = new AtomicLong(0);
    private final AtomicInteger activeSessions = new AtomicInteger(0);
    private final List<Double> responseTimes = new ArrayList<>();
    private final Map<String, UserSession> sessions = new ConcurrentHashMap<>();
    private final Random random = new Random();
    
    public static void main(String[] args) {
        SpringApplication.run(AnalyticsService.class, args);
        logger.info("🐺 Belfort Analytics Service initialized at port 8080");
    }
    
    @GetMapping("/dashboard")
    public ResponseEntity<AnalyticsDashboard> getDashboardData() {
        logger.info("Dashboard requested");
        
        AnalyticsDashboard dashboard = new AnalyticsDashboard();
        dashboard.setTimestamp(Instant.now().toString());
        dashboard.setTotalRequests(totalRequests.get());
        dashboard.setActiveSessions(activeSessions.get());
        dashboard.setAvgResponseTime(calculateAverageResponseTime());
        dashboard.setErrorRate(calculateErrorRate());
        dashboard.setTopEndpoints(getTopEndpoints());
        
        return ResponseEntity.ok(dashboard);
    }
    
    @GetMapping("/realtime")
    public ResponseEntity<ObjectNode> getRealtimeMetrics() {
        ObjectNode metrics = mapper.createObjectNode();
        metrics.put("activeUsers", activeSessions.get());
        metrics.put("requestsPerSecond", totalRequests.get() / 3600.0);
        metrics.put("avgResponseTime", calculateAverageResponseTime());
        metrics.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(metrics);
    }
    
    @PostMapping("/session")
    public ResponseEntity<SessionResponse> createSession(@RequestBody SessionRequest request) {
        String sessionId = generateSessionId();
        UserSession session = new UserSession();
        session.setSessionId(sessionId);
        session.setUserId(request.getUserId());
        session.setCreatedAt(Instant.now());
        session.setLastActivity(Instant.now());
        
        sessions.put(sessionId, session);
        activeSessions.incrementAndGet();
        
        logger.info("Session created: {}", sessionId);
        
        SessionResponse response = new SessionResponse();
        response.setSessionId(sessionId);
        response.setStatus("active");
        response.setExpiresIn(3600);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<Void> destroySession(@PathVariable String sessionId) {
        UserSession removed = sessions.remove(sessionId);
        if (removed != null) {
            activeSessions.decrementAndGet();
            logger.info("Session destroyed: {}", sessionId);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
    
    @Scheduled(fixedRate = 30000) // Every 30 seconds
    public void cleanupSessions() {
        Instant now = Instant.now();
        List<String> expiredSessions = sessions.entrySet().stream()
            .filter(entry -> {
                Instant lastActivity = entry.getValue().getLastActivity();
                return lastActivity.plusSeconds(3600).isBefore(now);
            })
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
        
        expiredSessions.forEach(sessionId -> {
            sessions.remove(sessionId);
            activeSessions.decrementAndGet();
            logger.debug("Expired session cleaned: {}", sessionId);
        });
    }
    
    @Scheduled(fixedRate = 5000) // Every 5 seconds
    public void updateMetrics() {
        totalRequests.incrementAndGet();
        // Simulate response time
        responseTimes.add(random.nextDouble() * 100 + 10);
        if (responseTimes.size() > 1000) {
            responseTimes.remove(0);
        }
    }
    
    private double calculateAverageResponseTime() {
        if (responseTimes.isEmpty()) return 0.0;
        return responseTimes.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }
    
    private double calculateErrorRate() {
        return random.nextDouble() * 0.05; // Simulated error rate
    }
    
    private List<String> getTopEndpoints() {
        List<String> endpoints = new ArrayList<>();
        endpoints.add("/api/analytics/dashboard");
        endpoints.add("/api/analytics/realtime");
        endpoints.add("/api/sessions/create");
        endpoints.add("/api/data/process");
        return endpoints;
    }
    
    private String generateSessionId() {
        return java.util.UUID.randomUUID().toString();
    }
}

// Domain Models
class UserSession {
    private String sessionId;
    private String userId;
    private Instant createdAt;
    private Instant lastActivity;
    
    // Getters and setters
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getLastActivity() { return lastActivity; }
    public void setLastActivity(Instant lastActivity) { this.lastActivity = lastActivity; }
}

class SessionRequest {
    private String userId;
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
}

class SessionResponse {
    private String sessionId;
    private String status;
    private int expiresIn;
    // Getters and setters
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getExpiresIn() { return expiresIn; }
    public void setExpiresIn(int expiresIn) { this.expiresIn = expiresIn; }
}

class AnalyticsDashboard {
    private String timestamp;
    private long totalRequests;
    private int activeSessions;
    private double avgResponseTime;
    private double errorRate;
    private List<String> topEndpoints;
    
    // Getters and setters
    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    public long getTotalRequests() { return totalRequests; }
    public void setTotalRequests(long totalRequests) { this.totalRequests = totalRequests; }
    public int getActiveSessions() { return activeSessions; }
    public void setActiveSessions(int activeSessions) { this.activeSessions = activeSessions; }
    public double getAvgResponseTime() { return avgResponseTime; }
    public void setAvgResponseTime(double avgResponseTime) { this.avgResponseTime = avgResponseTime; }
    public double getErrorRate() { return errorRate; }
    public void setErrorRate(double errorRate) { this.errorRate = errorRate; }
    public List<String> getTopEndpoints() { return topEndpoints; }
    public void setTopEndpoints(List<String> topEndpoints) { this.topEndpoints = topEndpoints; }
}
