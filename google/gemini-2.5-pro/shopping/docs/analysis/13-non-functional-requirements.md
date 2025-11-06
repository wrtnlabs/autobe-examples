
# 13. Non-Functional Requirements

## 1. Introduction to Non-Functional Requirements (NFRs)

This document specifies the Non-Functional Requirements (NFRs) for the shopping mall platform. NFRs define the quality attributes and operational characteristics of the system, complementing the functional requirements which describe what the system does. These requirements are crucial for ensuring a positive user experience, maintaining data security, and guaranteeing the long-term viability and growth of the platform. Adherence to these NFRs is mandatory for all development and architectural decisions.

This document is intended for backend developers, architects, and operations teams to ensure the system is built to be performant, secure, scalable, and reliable from the ground up.

## 2. Performance Requirements

High performance is critical for user retention and conversion in an e-commerce environment. The system must feel fast and responsive, even under significant load.

### 2.1. API Response Times

To ensure a consistent user experience, API response times shall be measured at the 95th (P95) and 99th (P99) percentiles, representing the response time that 95% and 99% of requests, respectively, should be faster than.

-   **THE** system **SHALL** serve Tier 1 API requests (e.g., fetching user profile, a single product, category lists) with a P95 latency of under 300ms and a P99 latency of under 500ms.
-   **THE** system **SHALL** serve Tier 2 API requests (e.g., complex search queries, filtered product lists) with a P95 latency of under 800ms and a P99 latency of under 1,500ms.
-   **THE** system **SHALL** process each step within the multi-step checkout flow (e.g., address validation, shipping option calculation) with a P95 latency of under 700ms.

### 2.2. Concurrency and Load Handling

-   **THE** system **SHALL** be capable of handling 1,000 concurrent active users performing a standard workload mix without response times exceeding the defined P95 targets. A standard workload mix is defined as:
    -   70% of users browsing products and categories.
    -   20% of users performing searches and managing their shopping carts.
    -   10% of users engaged in the checkout process.
-   **WHILE** a major sales event is active, **THE** system **SHALL** scale to handle a peak load of at least 10,000 requests per minute while maintaining P95 response times below a 50% degradation threshold.
-   **THE** system **SHALL** maintain average CPU and memory utilization below 75% under normal operating load to accommodate traffic spikes.

## 3. Security Requirements

Security is paramount for building trust with users and protecting sensitive data. The system must be designed with a security-first mindset and a defense-in-depth approach.

### 3.1. Data Protection and Encryption

-   **THE** system **SHALL** encrypt all sensitive user data at rest, including but not limited to passwords, personal information, and addresses, using a strong, industry-standard cryptographic algorithm (e.g., AES-256).
-   **THE** system **SHALL** use Transport Layer Security (TLS) 1.2 or higher for all data transmitted between clients and the server (data in transit). Non-HTTPS traffic must be rejected or redirected.
-   **THE** system **SHALL** hash all user passwords using a strong, adaptive, one-way hashing algorithm with a unique salt for each credential (e.g., bcrypt with a work factor of 12 or higher).

### 3.2. Authentication and Secure Access

-   **THE** system **SHALL** enforce a strict password policy for all user accounts: minimum 10 characters, including at least one uppercase letter, one lowercase letter, one number, and one special character.
-   **THE** system **SHALL** enforce Role-Based Access Control (RBAC) for every API endpoint. Each request must be authenticated and authorized before processing.
-   **WHEN** an unauthenticated user attempts to access a protected resource, **THE** system **SHALL** respond with an HTTP 401 Unauthorized status.
-   **WHEN** an authenticated user attempts to perform an action for which their role does not have permission, **THE** system **SHALL** respond with an HTTP 403 Forbidden status.
-   **THE** system **SHALL** implement rate limiting on authentication endpoints to mitigate brute-force attacks (e.g., no more than 10 failed login attempts per user per hour).

### 3.3. Vulnerability Prevention and Management

-   **THE** system **SHALL** be protected against common web application vulnerabilities, including the OWASP Top 10 (e.g., Injection, Broken Authentication, Cross-Site Scripting, etc.).
-   **THE** system **SHALL** use parameterized queries or an Object-Relational Mapping (ORM) framework that properly handles parameterization for all database interactions to prevent SQL injection.
-   **THE** system **SHALL** perform automated dependency scanning in the CI/CD pipeline to identify and flag known vulnerabilities in third-party libraries.
-   **WHEN** a critical security vulnerability is identified in a dependency, **THE** system development team **SHALL** have a process to patch it within 7 days.

## 4. Scalability and Elasticity

The platform must be able to grow seamlessly as the user base, product catalog, and transaction volume expand.

-   **THE** application architecture **SHALL** be stateless, allowing for horizontal scaling by adding more application instances behind a load balancer.
-   **THE** system **SHALL** utilize a message queue for handling asynchronous tasks (e.g., sending notification emails, processing reports) to decouple services and improve responsiveness.
-   **THE** database architecture **SHALL** utilize a primary/replica setup, directing write operations to the primary instance and distributing read operations across one or more read replicas.
-   **THE** system **SHALL** leverage cloud-native services that support auto-scaling based on metrics like CPU utilization or request count.

## 5. Availability and Reliability

The platform must be highly available to ensure that customers and sellers can access it at all times.

-   **THE** system **SHALL** achieve a minimum of 99.9% uptime, as measured monthly, excluding planned maintenance windows.
-   **THE** system **SHALL** not have a single point of failure. Key components (load balancers, application instances, database) must have redundancy.
-   **WHEN** planned maintenance is required, it **SHALL** be scheduled during off-peak hours (e.g., between 2:00 AM and 4:00 AM UTC) and announced to users in advance.
-   **THE** system **SHALL** implement health check endpoints that a load balancer can use to automatically remove unhealthy application instances from the request pool.

### 5.1. Data Backup and Recovery

-   **THE** system **SHALL** perform automated, full daily backups and continuous point-in-time recovery logging for the production database.
-   **THE** system **SHALL** store all backups in a secure, geo-redundant location separate from the primary production environment.
-   **THE** system **SHALL** have a documented and tested Disaster Recovery (DR) plan.
-   **THE** system **SHALL** have a Recovery Time Objective (RTO) of 2 hours, defining the maximum acceptable time for the service to be restored after a disaster.
-   **THE** system **SHALL** have a Recovery Point Objective (RPO) of 15 minutes, defining the maximum acceptable amount of data loss in the event of a critical failure.

## 6. Data Integrity

Data integrity ensures that data is accurate and consistent throughout its lifecycle, which is critical for transactional operations.

-   **THE** system **SHALL** enforce transactional integrity (ACID properties) for all database operations related to orders, payments, and inventory adjustments.
-   **WHEN** a customer places an order, **THE** system **SHALL** use a single, atomic database transaction to create the order record, update inventory levels, and record the payment transaction to prevent data inconsistencies.
-   **THE** system **SHALL** use database-level constraints (e.g., foreign keys, unique constraints, check constraints) to enforce data integrity and referential integrity at the lowest possible layer.

## 7. Logging, Monitoring, and Auditing

A robust logging and monitoring strategy is essential for observability, troubleshooting, and security.

-   **THE** system **SHALL** generate structured logs (e.g., in JSON format) for all API requests, including key information such as the endpoint, user ID, response status, and request duration.
-   **THE** system **SHALL** centralize logs from all services into a dedicated log aggregation platform for unified analysis and searching.
-   **THE** system **SHALL** retain application logs for at least 30 days and audit logs for at least 1 year.
-   **THE** system **SHALL** have a real-time monitoring dashboard displaying key performance indicators (KPIs), such as API error rates, latency percentiles, and resource utilization.
-   **WHEN** a critical error rate exceeds 1% over a 5-minute period or a key service becomes unresponsive, **THE** system **SHALL** trigger an automated alert to the on-call engineering team.
-   **THE** system **SHALL** create an immutable audit log entry for every security-sensitive action performed by an administrator, as detailed in the `12-admin-dashboard-functions.md` document.

## 8. Compliance Requirements

The platform must adhere to relevant industry standards and regulations.

### 8.1. Payment Card Industry Data Security Standard (PCI-DSS)

-   **THE** system **SHALL NOT** store, process, or transmit raw credit card numbers, magnetic stripe data, or CVV codes under any circumstances.
-   **THE** system **SHALL** delegate all handling of cardholder data to a third-party payment gateway that is certified as PCI-DSS Level 1 compliant.
-   **THE** system **SHALL** use tokenization (e.g., via iframe or client-side library provided by the payment gateway) to ensure that sensitive cardholder data never touches the application servers.

### 8.2. Data Privacy Regulations (e.g., GDPR, CCPA)

-   **THE** system **SHALL** provide mechanisms for users to exercise their data privacy rights, including the right to access, rectify, and erase their personal data.
-   **WHEN** a user requests data erasure ("right to be forgotten"), **THE** system **SHALL** anonymize their personal data in a way that preserves the integrity of transactional records (e.g., replacing personal details in past orders with a placeholder) while removing all personally identifiable information.
-   **THE** system **SHALL** obtain explicit and affirmative consent from users before collecting or processing their personal data for non-essential purposes (e.g., marketing communications).
