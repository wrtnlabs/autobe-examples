# Non-Functional Requirements

## Document Overview

This document defines the quality attributes, operational constraints, and compliance requirements for the e-commerce shopping mall platform. These requirements ensure the system operates reliably, securely, and efficiently while meeting legal obligations and user expectations.

---

## 1. Performance Requirements

### 1.1 User-Facing Response Times

**Page Load Performance**

THE system SHALL display the initial page content within 2 seconds for all product listing pages under normal network conditions.

WHEN a customer accesses any page on the platform, THE system SHALL render the visible content (above-the-fold) within 3 seconds on standard mobile connections (3G or better).

THE system SHALL achieve a Time to Interactive (TTI) of under 5 seconds for product detail pages on desktop devices.

**Search Performance**

WHEN a customer submits a product search query, THE system SHALL return results within 2 seconds for queries against the product catalog.

WHEN a customer applies filters to search results, THE system SHALL update the result list within 1 second.

THE system SHALL support concurrent search operations from at least 500 users without degradation of response time.

**Cart and Checkout Performance**

WHEN a customer adds an item to their cart, THE system SHALL update the cart state and display confirmation within 1 second.

WHEN a customer proceeds through checkout steps, THE system SHALL transition between checkout stages within 2 seconds.

WHEN a customer places an order, THE system SHALL complete order creation and payment processing within 10 seconds under normal conditions.

**Account Management Performance**

WHEN a user logs in to the platform, THE system SHALL authenticate and redirect to the main page within 3 seconds.

WHEN a user updates their profile information, THE system SHALL save changes and display confirmation within 2 seconds.

### 1.2 Seller Operations Performance

**Product Management Performance**

WHEN a seller creates or edits a product, THE system SHALL save changes within 3 seconds for products with up to 10 images.

WHEN a seller uploads product images, THE system SHALL process and store each image within 5 seconds per image.

WHEN a seller views their product list, THE system SHALL display paginated results within 2 seconds for lists of up to 100 products.

**Inventory Management Performance**

WHEN a seller updates inventory quantities, THE system SHALL reflect changes immediately in the product availability status.

WHEN a seller views inventory history for a variant, THE system SHALL retrieve and display the last 90 days of records within 2 seconds.

**Order Management Performance**

WHEN a seller views their order items, THE system SHALL display paginated results within 3 seconds for orders across multiple products.

WHEN a seller creates a shipment with tracking information, THE system SHALL update all relevant order items within 2 seconds.

### 1.3 Administrative Operations Performance

WHEN an administrator views pending seller approvals, THE system SHALL display the list within 2 seconds.

WHEN an administrator performs oversight actions on products or orders, THE system SHALL complete the operation within 3 seconds.

WHEN an administrator generates reports or views platform-wide statistics, THE system SHALL respond within 10 seconds for operations spanning up to 1 million records.

### 1.4 Throughput Requirements

THE system SHALL support at least 1,000 concurrent user sessions during peak traffic periods.

THE system SHALL process at least 100 order transactions per minute during normal operations.

THE system SHALL support at least 50 concurrent seller operations (product edits, inventory updates, shipments) without performance degradation.

THE system SHALL handle at least 10,000 product searches per minute during peak periods.

### 1.5 Real-Time Requirements

**Inventory Synchronization**

WHEN an order is placed, THE system SHALL update inventory quantities in real-time and make updated stock levels immediately visible to all users.

WHEN a cancellation or refund is approved, THE system SHALL restore inventory quantities within 1 minute.

**Order Status Updates**

WHEN a shipment is created, THE system SHALL immediately update order item statuses to "shipped" and notify the customer.

WHEN delivery is confirmed (manually or automatically), THE system SHALL update order item statuses immediately.

### 1.6 Performance Monitoring

THE system SHALL log response times for all user-facing operations.

THE system SHALL maintain performance metrics for the following operations:
- Product search queries
- Order placement
- Payment processing
- Image uploads
- Page loads by category

THE system SHALL alert administrators when response times exceed defined thresholds by more than 50%.

---

## 2. Security Requirements

### 2.1 Authentication Security

**Password Security**

THE system SHALL require passwords with a minimum length of 8 characters.

THE system SHALL require passwords to contain at least one uppercase letter, one lowercase letter, one number, and one special character.

THE system SHALL hash all passwords using a strong cryptographic algorithm before storage.

THE system SHALL salt password hashes with a unique salt per user.

THE system SHALL prevent password reuse of the last 5 passwords when a user changes their password.

**Session Management**

THE system SHALL use JSON Web Tokens (JWT) for session management.

THE system SHALL issue access tokens with an expiration time of 15-30 minutes.

THE system SHALL issue refresh tokens with an expiration time of 7-30 days.

THE system SHALL invalidate refresh tokens when a user explicitly logs out.

THE system SHALL allow users to revoke all active sessions from any device.

THE system SHALL securely store refresh tokens and prevent unauthorized access.

**Login Protection**

THE system SHALL lock an account after 5 consecutive failed login attempts.

WHEN an account is locked, THE system SHALL require either a password reset or a 15-minute waiting period before allowing further attempts.

THE system SHALL send an email notification when an account is locked due to failed login attempts.

THE system SHALL log all login attempts (successful and failed) with IP address and timestamp.

### 2.2 Authorization and Access Control

**Role-Based Access Control**

THE system SHALL enforce role-based access control for all operations based on user actor type (customer, seller, admin, super admin).

THE system SHALL verify user permissions before allowing access to any protected resource or operation.

THE system SHALL deny access immediately when a user attempts an operation outside their permission scope.

**Resource Ownership Verification**

WHEN a user attempts to access or modify a resource, THE system SHALL verify the user owns the resource or has appropriate administrative privileges.

THE system SHALL prevent customers from viewing other customers' orders, addresses, or personal information.

THE system SHALL prevent sellers from accessing or modifying products belonging to other sellers.

THE system SHALL allow administrators to access platform-wide resources only through specific administrative interfaces.

**Administrative Privilege Separation**

THE system SHALL distinguish between regular administrator and super administrator privileges.

THE system SHALL enforce that only super administrators can promote or demote administrator grades.

THE system SHALL prevent super administrators from demoting themselves.

### 2.3 Data Protection and Encryption

**Data in Transit**

THE system SHALL encrypt all data transmitted between clients and servers using TLS 1.2 or higher.

THE system SHALL enforce HTTPS for all connections and reject unencrypted HTTP requests.

THE system SHALL use strong cipher suites and disable weak or deprecated encryption algorithms.

**Data at Rest**

THE system SHALL encrypt sensitive personal data stored in databases, including:
- Email addresses
- Phone numbers
- Shipping addresses
- Payment information

THE system SHALL use industry-standard encryption algorithms (AES-256 or equivalent) for data at rest.

THE system SHALL manage encryption keys securely with regular key rotation schedules.

**Payment Data Protection**

THE system SHALL NOT store full credit card numbers or CVV codes on the platform.

THE system SHALL integrate with PCI-DSS compliant payment gateway providers.

THE system SHALL transmit payment information directly to payment processors without intermediate storage.

THE system SHALL store only payment transaction references and last 4 digits of cards for display purposes.

### 2.4 Input Validation and Sanitization

THE system SHALL validate all user input on both client and server sides.

THE system SHALL sanitize all user-submitted content to prevent:
- SQL injection attacks
- Cross-site scripting (XSS) attacks
- Cross-site request forgery (CSRF) attacks
- Command injection attacks

THE system SHALL enforce maximum length limits on all text input fields.

THE system SHALL reject malformed or suspicious input and log the attempt for security review.

THE system SHALL implement rate limiting on all public-facing forms and API endpoints.

### 2.5 API Security

THE system SHALL require authentication for all API endpoints except public endpoints (login, registration, password reset).

THE system SHALL validate JWT tokens on every authenticated request.

THE system SHALL reject expired or invalid tokens with appropriate error responses.

THE system SHALL implement rate limiting per user and per IP address for API calls.

THE system SHALL use API versioning to maintain backward compatibility while allowing security updates.

THE system SHALL log all API requests with timestamps, user identifiers, and operation types for audit purposes.

### 2.6 File Upload Security

THE system SHALL validate file types for all uploads, accepting only allowed formats (JPEG, PNG for images).

THE system SHALL scan uploaded files for malware before storage.

THE system SHALL generate unique filenames for uploaded files to prevent path traversal attacks.

THE system SHALL limit file sizes to 10MB per image and 50MB total per product.

THE system SHALL store uploaded files in a separate storage service with no execute permissions.

### 2.7 Security Logging and Monitoring

THE system SHALL log all security-relevant events, including:
- Authentication attempts (success and failure)
- Authorization failures
- Account creation, modification, and deletion
- Password changes and resets
- Administrative actions
- Payment transactions
- Failed input validation

THE system SHALL protect security logs from unauthorized access, modification, or deletion.

THE system SHALL retain security logs for a minimum of 2 years.

THE system SHALL provide administrators with access to security logs for investigation purposes.

---

## 3. Data Privacy and Compliance

### 3.1 GDPR Compliance Overview

THE system SHALL comply with the General Data Protection Regulation (GDPR) for all users within the European Union.

THE system SHALL provide mechanisms for users to exercise their data protection rights, including:
- Right to access their personal data
- Right to rectify inaccurate data
- Right to erase their data (subject to legal preservation requirements)
- Right to data portability
- Right to restrict processing
- Right to object to processing

### 3.2 Personal Data Handling

**Data Minimization**

THE system SHALL collect only the personal data necessary for the platform's operation and user experience.

THE system SHALL not require more information than necessary for each operation:
- Registration: email, password
- Customer profile: display name, phone number (optional)
- Shipping addresses: recipient name, phone, address details
- Seller profile: shop name, description, logo (optional)

**Purpose Limitation**

THE system SHALL use collected personal data only for the purposes disclosed to users at the time of collection.

THE system SHALL not share personal data with third parties without explicit user consent, except where required by law.

**Data Accuracy**

THE system SHALL allow users to update their personal information at any time.

THE system SHALL verify email addresses during registration through confirmation emails.

THE system SHALL prompt users to review and update their information periodically.

### 3.3 Data Preservation and the Right to Erasure

**Customer Account Deletion**

WHEN a customer requests account deletion, THE system SHALL preserve specific data as required for legal compliance and legitimate business interests:
- Order history (for seller records, tax compliance, and dispute resolution)
- Payment records (for financial auditing requirements)
- Review content (displayed as "deleted user" to maintain product information integrity)

THE system SHALL anonymize preserved data by removing direct identifiers (email, phone number, display name).

THE system SHALL retain the minimum data necessary to serve the preservation purposes.

**Seller Account Deletion**

WHEN a seller deletes their account, THE system SHALL preserve:
- Order history with product snapshots (customer purchase records)
- Shop name as preserved in order snapshots
- Product information preserved in order item snapshots

THE system SHALL remove seller products from active listings immediately upon deletion.

THE system SHALL anonymize the seller account while preserving references to their shop name in historical orders.

**Snapshot Data Retention**

THE system SHALL preserve all snapshots indefinitely for dispute resolution and audit purposes.

THE system SHALL include snapshots in any data export requests as part of the user's data portability rights.

THE system SHALL not delete snapshots even when the source data is deleted.

### 3.4 Data Retention Policies

**Active Account Data**

THE system SHALL retain all active user data for the duration of the account.

THE system SHALL retain inactive account data for 3 years before marking for archival or deletion, subject to user login activity.

**Order Data Retention**

THE system SHALL retain order records for a minimum of 7 years for tax and legal compliance.

THE system SHALL retain order snapshots indefinitely for dispute resolution.

**Log Data Retention**

THE system SHALL retain security logs for 2 years.

THE system SHALL retain performance logs for 1 year.

THE system SHALL retain general activity logs for 6 months.

**Deleted Data Handling**

THE system SHALL mark deleted data as inactive rather than physically deleting it from the database.

THE system SHALL purge physically deleted data through a secure deletion process that prevents recovery.

### 3.5 Cross-Border Data Transfer

THE system SHALL ensure appropriate safeguards for personal data transferred outside the user's country of residence.

THE system SHALL use Standard Contractual Clauses or other approved mechanisms for international data transfers.

THE system SHALL inform users about potential cross-border data transfers in the privacy policy.

### 3.6 User Consent Management

THE system SHALL obtain explicit consent before:
- Sending marketing communications
- Sharing data with third parties
- Setting non-essential cookies

THE system SHALL allow users to withdraw consent at any time through their account settings.

THE system SHALL maintain records of consent with timestamps and the specific consent text agreed to.

### 3.7 Privacy Policy and Transparency

THE system SHALL display a clear, accessible privacy policy that explains:
- What data is collected
- How data is used
- How long data is retained
- User rights regarding their data
- How to contact the data protection officer

THE system SHALL notify users of any material changes to the privacy policy.

THE system SHALL require users to acknowledge updated privacy terms when significant changes occur.

### 3.8 Cookie and Tracking Policies

THE system SHALL provide a cookie consent banner on first visit.

THE system SHALL categorize cookies into essential and non-essential categories.

THE system SHALL not set non-essential cookies until user consent is obtained.

THE system SHALL allow users to manage cookie preferences at any time.

---

## 4. Availability and Reliability

### 4.1 System Uptime Requirements

THE system SHALL maintain 99.9% uptime availability (excluding scheduled maintenance), which permits approximately 8.76 hours of downtime per year.

THE system SHALL schedule maintenance windows during low-traffic periods (typically between 2:00 AM and 5:00 AM in the primary user timezone).

THE system SHALL provide advance notice of at least 48 hours for scheduled maintenance.

THE system SHALL limit scheduled maintenance windows to 4 hours maximum.

### 4.2 Fault Tolerance and Recovery

**Error Handling**

THE system SHALL handle errors gracefully and provide user-friendly error messages.

WHEN an error occurs, THE system SHALL preserve user input where possible and allow retry without re-entering data.

THE system SHALL log all errors with sufficient detail for debugging while not exposing sensitive information to users.

THE system SHALL distinguish between recoverable errors (user can retry) and non-recoverable errors (requires support intervention).

**Transaction Integrity**

THE system SHALL ensure atomic transactions for operations involving multiple data updates, such as:
- Order placement (cart clearance, inventory reduction, order creation, payment processing)
- Payment processing (order status update, inventory finalization)
- Refund processing (order status update, inventory restoration)

THE system SHALL roll back all related changes if any part of a transaction fails.

THE system SHALL provide appropriate feedback to users when a transaction fails.

**Data Consistency**

THE system SHALL ensure inventory counts remain consistent even during concurrent order placements for the same product variant.

THE system SHALL implement optimistic or pessimistic locking strategies for inventory operations to prevent overselling.

THE system SHALL verify data integrity after recovery from any failure.

### 4.3 Data Backup and Restore

**Backup Schedule**

THE system SHALL perform full database backups daily.

THE system SHALL perform incremental backups every 4 hours.

THE system SHALL backup snapshots and immutable historical data separately from active operational data.

THE system SHALL backup user-uploaded files (product images, logos) daily.

**Backup Retention**

THE system SHALL retain daily backups for 30 days.

THE system SHALL retain weekly backups for 12 months.

THE system SHALL retain monthly backups for 3 years.

THE system SHALL store backups in geographically separate locations from the primary data center.

**Restore Capabilities**

THE system SHALL be able to restore from any backup within 4 hours.

THE system SHALL support point-in-time recovery for the last 7 days.

THE system SHALL verify backup integrity monthly through test restores.

### 4.4 Disaster Recovery

**Disaster Recovery Plan**

THE system SHALL maintain a documented disaster recovery plan.

THE system SHALL define Recovery Time Objective (RTO) of 4 hours for full system restoration.

THE system SHALL define Recovery Point Objective (RPO) of maximum 1 hour of data loss.

THE system SHALL maintain a standby disaster recovery environment in a separate geographic region.

**Failover Capabilities**

THE system SHALL support automatic failover to standby systems when primary systems fail health checks.

THE system SHALL complete failover within 15 minutes of primary system failure.

THE system SHALL maintain data synchronization between primary and standby systems to minimize data loss during failover.

### 4.5 Graceful Degradation

WHEN the search service is unavailable, THE system SHALL still allow users to browse products by category.

WHEN the image storage service is unavailable, THE system SHALL display product listings with placeholder images and maintain full functionality.

WHEN the payment gateway is unavailable, THE system SHALL:
- Allow users to continue browsing and adding items to cart
- Display a clear message that checkout is temporarily unavailable
- Queue orders and process them when payment service is restored

WHEN experiencing high traffic, THE system SHALL prioritize:
- Active checkout processes (preserving in-progress orders)
- Order placement operations
- Core browsing and search functionality

THE system SHALL disable non-essential features during extreme load to preserve core functionality.

### 4.6 Health Monitoring

THE system SHALL perform health checks on all critical components every 60 seconds.

THE system SHALL alert administrators immediately when health checks fail for critical services.

THE system SHALL provide a dashboard showing real-time system health status.

THE system SHALL track and display key metrics:
- Response times by operation type
- Error rates
- Resource utilization (CPU, memory, storage)
- Active user sessions
- Database connection pool status

---

## 5. Scalability Considerations

### 5.1 Horizontal Scaling

THE system SHALL support horizontal scaling for stateless application servers to handle increased traffic.

THE system SHALL support load balancing across multiple application server instances.

THE system SHALL maintain session state externally (in distributed cache or database) to allow requests to be served by any available server.

THE system SHALL support auto-scaling to add server instances during traffic spikes.

THE system SHALL support scaling down during low-traffic periods to optimize resource usage.

### 5.2 Database Scalability

**Read Scaling**

THE system SHALL support read replicas for the database to distribute read-heavy operations (product browsing, search).

THE system SHALL route reporting and analytics queries to separate read replicas to avoid impacting operational performance.

THE system SHALL support eventual consistency for read replicas with maximum lag of 1 second for inventory-related queries.

**Write Scaling**

THE system SHALL support database connection pooling to handle concurrent write operations efficiently.

THE system SHALL implement query optimization for common write patterns (order creation, inventory updates).

THE system SHALL support partitioning of historical data (snapshots, old orders) from active operational data.

**Data Archival**

THE system SHALL support archiving of old order data (older than 2 years) to separate storage while maintaining accessibility for historical queries.

THE system SHALL support archiving of old snapshots to cold storage while preserving them for dispute resolution.

### 5.3 Traffic Handling During Peak Events

THE system SHALL handle 5x normal traffic capacity during sales events or promotional periods.

THE system SHALL support queueing mechanisms for order processing during traffic spikes to prevent system overload.

THE system SHALL prioritize checkout completion over new cart additions during extreme load.

THE system SHALL implement rate limiting per user during peak periods to ensure fair resource distribution.

THE system SHALL provide advance capacity planning for known high-traffic events (holiday seasons, planned sales).

### 5.4 Resource Optimization

**Caching Strategy**

THE system SHALL implement caching for frequently accessed data:
- Product listings and details (refreshed on product edit)
- Category structures (refreshed on category changes)
- Seller profile information (refreshed on profile edit)
- Average ratings and review counts (refreshed on new review)

THE system SHALL use distributed cache for session data and frequently accessed user information.

THE system SHALL implement cache invalidation when source data changes.

THE system SHALL support cache warmup on system restart to minimize cold-start impact.

**Image Optimization**

THE system SHALL automatically resize and optimize uploaded images for different display contexts:
- Thumbnails for product listings
- Medium resolution for product detail pages
- Original resolution for zoom functionality

THE system SHALL use CDN (Content Delivery Network) for image delivery to reduce latency.

THE system SHALL implement lazy loading for images in product listings.

**Query Optimization**

THE system SHALL optimize database queries for common access patterns:
- Product search with filters
- Order history retrieval
- Inventory history retrieval
- Seller dashboard statistics

THE system SHALL use appropriate database indexes to support efficient queries.

THE system SHALL monitor slow queries and optimize queries exceeding performance thresholds.

### 5.5 Future Growth Considerations

THE system architecture SHALL support:
- Geographic distribution with regional data centers for global user base expansion
- Multi-tenancy capabilities for potential white-label or franchise deployments
- Integration with additional payment gateways without significant architecture changes
- Integration with additional shipping carriers and tracking systems
- Microservices decomposition of specific modules (search, payment, notifications) as the platform grows

---

## 6. Compatibility and Interoperability

### 6.1 Browser Compatibility

THE system SHALL support the latest two major versions of:
- Google Chrome
- Mozilla Firefox
- Apple Safari
- Microsoft Edge

THE system SHALL support mobile browsers on iOS (Safari) and Android (Chrome) for the latest two major OS versions.

THE system SHALL provide graceful degradation for older browsers while maintaining core functionality.

### 6.2 API Standards

THE system SHALL implement RESTful API design principles for all public and internal APIs.

THE system SHALL use JSON as the primary data exchange format.

THE system SHALL provide consistent error response formats across all API endpoints.

THE system SHALL implement API versioning to support backward compatibility.

### 6.3 Integration Requirements

THE system SHALL integrate with external payment gateways through standardized protocols.

THE system SHALL support integration with shipping carrier APIs for tracking number validation.

THE system SHALL support email delivery through standard SMTP or email service APIs.

THE system SHALL support future integrations through a modular integration architecture.

---

## 7. Maintainability and Supportability

### 7.1 Code Quality

THE system SHALL follow established coding standards and style guides for the technology stack.

THE system SHALL maintain comprehensive code documentation for all business logic.

THE system SHALL implement automated testing with minimum 80% code coverage for business logic.

THE system SHALL use version control for all code and configuration.

### 7.2 Logging and Diagnostics

THE system SHALL implement structured logging with consistent log formats.

THE system SHALL include correlation identifiers in logs to trace requests across services.

THE system SHALL provide different log levels (DEBUG, INFO, WARN, ERROR) configurable per environment.

THE system SHALL not log sensitive information (passwords, payment details, personal identification numbers) in plain text.

### 7.3 Deployment and Configuration

THE system SHALL support automated deployment processes.

THE system SHALL maintain separate environments for development, testing, staging, and production.

THE system SHALL use environment-specific configuration without code changes.

THE system SHALL support rolling deployments without downtime.

THE system SHALL support rollback to previous versions within 30 minutes.

---

## Summary

These non-functional requirements ensure the e-commerce platform delivers:

1. **Performance**: Fast, responsive user experience with specific response time targets for all operations
2. **Security**: Comprehensive protection of user data, secure transactions, and defense against common threats
3. **Privacy**: Full GDPR compliance with clear data handling, preservation, and user rights implementation
4. **Availability**: High uptime with robust fault tolerance, backup, and disaster recovery capabilities
5. **Scalability**: Architecture that supports growth from initial deployment to high-traffic enterprise operation

All requirements are specified using user-centric language and measurable criteria to enable clear verification and testing by backend developers.