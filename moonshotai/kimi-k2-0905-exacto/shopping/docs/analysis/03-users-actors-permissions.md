# Users, Actors & Permissions Specification

## Executive Summary

This document defines the complete authentication and authorization system for the shoppingMall multi-vendor e-commerce platform. It establishes five distinct user actors with granular permission controls, JWT-based authentication, and comprehensive security requirements for both buyers and sellers in the marketplace ecosystem.

THE platform SHALL implement role-based access control with five user actors: Guest, Customer, Seller, Courier, and Administrator. Each actor SHALL have specific permissions and access levels tailored to their role in the multi-vendor marketplace ecosystem.

## User Actor Definitions

### Guest (Non-Authenticated Visitor)

WHEN a visitor accesses the platform without logging in, THE system SHALL allow browsing of all products and categories with full visibility. THE guest SHALL be able to add items to cart, search products, view seller information, and compare products across multiple sellers. THE guest SHALL NOT be able to complete purchases, save addresses, write reviews, or track orders without creating an account. WHERE the guest adds items to cart, THE system SHALL temporarily store cart items for the duration of the session and offer account creation at checkout.

THE guest experience SHALL include product discovery through search functionality, category browsing, price comparison across sellers, viewing seller ratings and reviews, accessing product specifications and images, and using wishlist functionality during the browser session. IF a guest attempts to access restricted features, THEN THE system SHALL redirect to login page while preserving the original intent for post-login continuation.

THE system SHALL track guest browsing behavior for analytics purposes while respecting privacy constraints. THE guest sessions SHALL expire after 60 minutes of inactivity, requiring session restart for continued browsing. WHERE guests add items to cart, THE system SHALL maintain cart contents for 30 days using browser local storage to preserve shopping experience upon return visits.

### Customer (Standard User Account)

THE customer SHALL be the primary buyer on the platform with ability to make purchases from multiple sellers within single orders. WHEN a customer registers, THE system SHALL collect email address, password (minimum 8 characters with complexity requirements), full name, phone number, and default shipping address. THE customer SHALL maintain multiple shipping addresses, payment methods, and communication preferences. THE customer SHALL be able to write verified reviews only for purchased products, create and manage wishlists, track all orders regardless of seller, and initiate returns or refunds.

THE customer account SHALL support advanced features including saved searches with email notifications when new matching products are listed, automated price drop alerts for wishlist items, personalized product recommendations based on purchase and browsing history, order history with filtering and search capabilities, automated shipment tracking across all orders, and integration with calendar applications for delivery scheduling.

WHERE customers interact with multiple sellers, THE system SHALL provide unified order management showing consolidated orders grouped by seller while maintaining seller-specific communication channels. THE customer SHALL have access to dispute resolution mechanisms for seller-related issues including product problems, shipping delays, and return authorization requests.

THE authentication for customer accounts SHALL require email verification within 7 days of registration. IF email verification is not completed within this timeframe, THEN THE system SHALL mark the account as inactive and require re-registration. THE customer's browsing and purchase history SHALL be preserved for 24 months to enable personalized recommendations while allowing customers to delete specific browsing history records.

### Seller (Verified Vendor Account)

THE seller SHALL be a verified business entity approved by platform administrators before selling. WHEN a seller registers, THE system SHALL require business registration documents, tax identification number (validated against government databases where available), banking information for payment processing, business address verification through postal service APIs, proof of business insurance where required by policy, product category expertise documentation, and contact person verification including identity confirmation through official documents.

THE seller SHALL have full control over their product catalog including product creation and editing, pricing management with real-time market analysis suggestions, inventory management with automated reorder alerts, order processing workflow management, customer service tools including messaging interfaces, business analytics and reporting access, and financial account management including commission tracking.

THE seller SHALL NOT access other sellers' business information, customer data beyond necessary order fulfillment details, platform-wide analytics, administrative functions, or competitor sales data. THE seller SHALL be restricted to managing only their own inventory and shall see only aggregate platform metrics without seller-specific breakdowns.

THE seller authentication SHALL require two-factor authentication using either SMS verification to registered business phone numbers or authenticator applications. WHEN sellers access financial information or banking details, THE system SHALL require additional authentication verification through the registered contact information.

### Courier (Delivery Partner)

THE courier SHALL be an approved delivery service provider integrated with the shipping system. WHEN a courier account is created, THE system SHALL verify delivery service credentials including business registration, insurance covering goods in transit, coverage area verification against operational zones, vehicle registration for delivery vehicles, and driver license validation for delivery personnel.

THE courier SHALL update order tracking information with GPS coordinates during delivery routes, mark deliveries completed with photo evidence where policies require, document delivery exceptions including access issues and customer unavailability, coordinate delivery rescheduling with customers through authorized communication methods, and report package condition issues noticed during pickup or delivery processes.

THE courier SHALL access only order information necessary for delivery completion including customer name, delivery address, contact phone number for delivery coordination, seller information for pickup scheduling, package specifications including weight and dimensions, insurance declared value calculations, and delivery instructions provided by customers or sellers.

THE courier SHALL NOT access customer financial data, seller business information beyond contact details required for coordination, detailed product specifications, price information, or internal platform analytics. THE courier SHALL maintain delivery confidentiality and avoid discussing customer purchases or shopping patterns.

### Administrator (Platform Management)

THE administrator SHALL have unrestricted access to all platform operations and user management functions. WHEN acting as administrator, THE system SHALL provide comprehensive dashboards for seller verification queue management, dispute resolution case management, content moderation backlog processing, financial transaction oversight, platform performance monitoring, and user behavior analytics for optimization purposes.

THE administrator SHALL manage seller onboarding including application review, financial verification, insurance validation, seller performance monitoring, and account suspension decision-making. THE administrator SHALL coordinate dispute resolution between customers and sellers, oversee content moderation including product listings and user reviews, and manage platform policy enforcement with graduated response systems.

THE administrator SHALL maintain audit trails for all administrative actions including seller verification decisions, account suspension criteria, dispute resolution outcomes, and policy enforcement measures. THE administrator SHALL undergo training on platform policies, legal compliance requirements, and consistent enforcement standards to ensure fairness and transparency in all administrative decisions.

## Authentication Flow Requirements

### JWT Token Structure

THE access token SHALL be a JWT containing user identifier (numeric user ID), user email for communication reference, role identification (guest, customer, seller, courier, administrator), permissions array containing specific functional access rights, timestamp information including issued at time and expiration time, session identifier for session management, and device fingerprint for security validation. THE token SHALL expire after 15 minutes to maintain security while providing sufficient operation time for typical user activities.

THE refresh token SHALL be a long-lived JWT with extended expiration of 7-30 days depending on user role security requirements, stored securely in httpOnly cookies for web applications, maintained in secure storage for mobile applications with encryption protection, linked to session identifiers for concurrent login management, and capable of immediate revocation through admin action or device authorization changes. THE refresh mechanism SHALL provide new access tokens without requiring re-authentication while maintaining comprehensive audit trails for security monitoring.

THE JWT payload structure SHALL follow industry standards with proper claim names: "sub" for user ID, "email" for user email address, "role" for user role, "permissions" for array of permission strings, "iat" for issued at timestamp, "exp" for expiration timestamp, "jti" for JWT identifier (session ID), and "device" for device fingerprint hash. THE tokens SHALL be signed using RS256 algorithm with platform-controlled private keys and verification using public key distribution to API gateways.

### Token Validation Requirements

WHEN validating JWT tokens, THE system SHALL verify signature authenticity using public key infrastructure, confirm token expiration based on current time comparison, validate user account status ensuring users are not suspended or deleted, check permissions have not been revoked since token issuance, verify session validity ensuring tokens match authorized sessions, validate device fingerprint when security policies require additional verification, and confirm rate limiting compliance for preventing token abuse.

THE token validation SHALL complete within 100 milliseconds to maintain system performance and user experience. IF any validation step fails, THE system SHALL immediately reject the token and return appropriate error responses including invalid token format, signature verification failure, token expiration notice, insufficient permissions notification, or account verification requirement messages.

THE system SHALL maintain token blacklists for immediate revocation when security events occur including account compromise, device theft, or unauthorized access detection. THE blacklists SHALL be distributed across all API gateways with sub-second propagation times using efficient caching mechanisms.

## Permission Matrix

### Customer Permission Array Structure

THE customer permissions SHALL include detailed functional access rights:
- "account.read" for viewing account information and profiles
- "account.update" for modifying account details and preferences
- "address.create", "address.read", "address.update", "address.delete" for shipping address management
- "payment.create", "payment.read", "payment.update", "payment.delete" for payment method management
- "cart.create", "cart.read", "cart.update", "cart.delete" for shopping cart operations
- "order.create", "order.read", "order.update" for order placement and tracking (order deletion not permitted)
- "review.create", "review.read", "review.update", "review.delete" for verified purchase reviews
- "wishlist.create", "wishlist.read", "wishlist.update", "wishlist.delete" for wishlist management functionality

### Seller Permission Array Structure

THE seller permissions SHALL include specialized business capabilities:
- "seller.account.update" for modifying business profile information
- "product.create", "product.read", "product.update", "product.delete" for complete product catalog management
- "inventory.create", "inventory.read", "inventory.update" for inventory tracking (inventory deletion restricted)
- "order.read", "order.update" for order fulfillment processing (order creation and deletion restricted)
- "customer.read" for viewing customer information relevant to orders
- "analytics.read" for accessing seller performance metrics and reporting
- "payment.read" for viewing payment settings and transaction summaries

### Courier Permission Array Structure

THE courier permissions SHALL include delivery-specific access rights:
- "shipment.read" for viewing delivery route information
- "delivery.update" for updating package delivery status
- "tracking.create" for creating tracking event records
- "customer.read.name.address" for viewing limited customer information needed for delivery

### Administrator Permission Array Structure

THE administrator permissions SHALL include comprehensive platform management capabilities:
- "admin.users.manage" for user account administration including creation, modification, suspension, and deletion
- "admin.seller.verify" for reviewing seller applications and verifications
- "admin.content.moderate" for reviewing flagged content including products, reviews, and user communications
- "admin.dispute.resolve" for managing customer-seller disputes and mediation processes
- "admin.analytics.platform" for accessing platform-wide analytics and performance metrics
- "admin.policy.manage" for platform policy creation, modification, and enforcement

## Security Requirements

### Multi-Factor Authentication Implementation

WHERE enhanced security is required for seller accounts, THE system SHALL implement multi-factor authentication supporting SMS verification codes sent to registered mobile phone numbers, authenticator application integration with standard protocols (TOTP), backup recovery codes provided securely during initial setup, hardware token options for enterprise sellers, and device authorization management with ability to revoke specific device access permissions. THE multi-factor authentication SHALL become mandatory before sellers can list their first products or access banking information for payment processing setup.

THE authentication SHALL require step-up verification for sensitive operations including fund withdrawals, banking information modifications, bulk financial transactions, business profile changes that affect verification status, access to detailed customer contact information, and modification of commission structures or payment terms. THE step-up verification SHALL require re-authentication even within active sessions to ensure continued identity confirmation.

### Account Security Monitoring

THE platform SHALL implement comprehensive security monitoring detecting unusual login behavior patterns including access from new geographical locations, login attempts from unknown devices, multiple failed login attempts followed by successful access, simultaneous logins from geographically impossible locations, access patterns that deviate significantly from historical activity, and access attempts during unusual hours for specific user activity patterns. WHEN suspicious activity is detected, THE system SHALL automatically trigger additional verification requirements, notify account holders through registered contact methods, temporarily restrict high-value operations, initiate manual review by security team members, and implement progressive account restrictions based on severity of detected anomalies.

THE security monitoring SHALL maintain detailed audit logs including successful login events with timestamps and IP addresses, failed login attempts with attempted credentials analysis, permission changes and role modifications, financial transactions and banking access, content moderation actions, administrative interventions, and third-party integrations or API access. THE audit logs SHALL be retained for minimum 24 months for security analysis and compliance purposes.

### Data Protection and Privacy

THE platform SHALL implement data protection measures including personal data encryption using field-level encryption for sensitive information, secure data transmission protocols using TLS 1.3 minimum standards, database encryption at rest with key rotation schedules, secure backup procedures with encryption and geographic distribution, access logging for all personal data processing activities, and customer consent management with granular permission systems. THE data protection SHALL comply with applicable regulations including GDPR requirements for European users, CCPA requirements for California users, PCI DSS for payment data protection, and regional privacy laws based on user location determination.

THE platform SHALL provide users with comprehensive data control mechanisms including right to access personal data through download interfaces, right to correct inaccurate personal data through editing interfaces, right to delete personal data with appropriate retention exceptions, right to restrict processing of personal data with maintenance requirements, right to data portability for transfer to other services, right to object to processing for specific purposes, and right to withdraw consent for marketing communications. THE data control mechanisms SHALL be accessible through user interfaces and require identity verification before implementation.

## Business Process Workflows

### User Registration Business Process

WHEN a new user attempts registration, THE business process SHALL validate email uniqueness through database queries, enforce password complexity requirements including minimum length and character variety, verify email deliverability through confirmation email sending, validate phone number format and assignment to appropriate geographical regions, check age requirements ensuring users meet minimum age standards of 13 years, and verify acceptance of platform terms of service and privacy policy. IF any validation fails, THEN THE system SHALL provide specific error messages guiding users to correct invalid information while preserving previously entered valid data for user convenience.

THE registration confirmation process SHALL send verification emails containing unique confirmation links valid for 24 hours, provide alternative verification methods through SMS text messages or phone calls, enable resend functionality for expired or unreceived verification emails, automatically delete unverified account creation attempts after 7 days, and maintain detailed logs of all verification attempts including timestamps and IP address information. THE confirmation process SHALL prevent automated account creation attempts through CAPTCHA challenges and rate limiting mechanisms.

### Seller Verification Business Process

THE seller verification process SHALL include comprehensive business validation including business registration verification through government databases or official documentation, tax identification number validation through appropriate tax authorities, bank account verification through small deposit confirmation or official bank letter documentation, business address verification through postal mail confirmation or utility bill documentation, business insurance verification through certificate of insurance documentation, and ownership verification through official business documentation. THE verification process SHALL involve automated checks where possible with manual review for edge cases and complex business structures.

THE seller approval process SHALL require platform administrator review including evaluation of business legitimacy through documentation validation, assessment of product category expertise through previous experience verification, review of seller history across other platforms for behavioral patterns, analysis of business model alignment with platform policies and values, and verification of compliance with applicable regulations for specific product categories. THE approval decision SHALL be made within 3-5 business days with detailed explanations provided for any denials or additional information requests.

This comprehensive specification ensures a robust, secure, and user-friendly authentication and authorization system that protects user data while providing seamless access to platform functionality across all user types in the multi-vendor marketplace ecosystem.