# Table of Contents - PoliticsBbs Discussion Board

## Document Overview

This documentation set provides complete requirements and specifications for the **politicsBbs** discussion board system - a simple, focused platform designed for economic and political discourse. The documentation is organized into 8 interconnected documents that progress from high-level vision to detailed technical requirements, enabling backend developers to implement a complete TypeScript + NestJS + Prisma application with zero ambiguity.

## Project Context

**politicsBbs** is a streamlined discussion board system aimed at fostering intellectual discourse on economic and political topics. The system supports:
- Article creation with image and file attachments (up to 10 images at 5MB each, up to 5 files at 10MB each)
- Comment system for threaded discussions (3 levels deep)
- Content moderation with approval workflows
- Three user roles: Visitor (read-only), Member (content creators), Moderator (content managers)
- Simple categorization focused on economic and political content
- Basic search and discovery functionality

The platform addresses the market gap between social media noise and academic complexity, providing a dedicated space for substantive economic and political discourse.

## Document Structure

### 1. [Service Overview Document](./01-service-overview.md)
**Purpose**: High-level introduction and business vision  
**Audience**: General stakeholders and business teams  
**Content**: Vision, problem statements, target users (policy enthusiasts, students, professionals, citizen advocates), success criteria, business model with premium tiers, and revenue projections. Explains WHY this service exists in the market.

### 2. [Functional Requirements Document](./02-functional-requirements.md)
**Purpose**: Detailed business requirements specification  
**Audience**: Development and product teams  
**Content**: Complete system functions using EARS format (WHEN/THE/IF/THEN patterns), user functions, content management, article lifecycle, file attachments (images: JPEG/PNG/GIF, documents: PDF/DOC/DOCX), content moderation workflows, search functionality, performance targets, and error handling requirements.

### 3. [User Actors and Authentication Document](./03-user-actors.md)
**Purpose**: User roles, permissions, and authentication systems  
**Audience**: Development team and system architects  
**Content**: JWT-based authentication, Visitor (read-only access), Member (create articles, upload attachments, manage own content within 24 hours), Moderator (full content control), permission matrix, user lifecycle management, and security requirements including rate limiting and session management.

### 4. [User Scenarios Document](./04-user-scenarios.md)
**Purpose**: Real-world user journeys and interaction flows  
**Audience**: Product managers and UX designers  
**Content**: Browsing articles (with filtering and search), creating new articles (with validation), participating in discussions (threaded comments), uploading attachments (images and files), content moderation workflow, error recovery scenarios, and mobile responsiveness requirements.

### 5. [Business Rules Document](./05-business-rules.md)
**Purpose**: Constraints, policies, and validation rules  
**Audience**: Development team and domain experts  
**Content**: Content rules (50+ words required, economic/political focus), attachment guidelines (5MB max images, 10MB max files), user conduct standards, moderation policies (2-hour response targets), technical constraints (200ms validation time), graduated response system for violations, and privacy requirements.

### 6. [Technical Requirements Document](./06-technical-requirements.md)
**Purpose**: Non-functional requirements and system constraints  
**Audience**: Development and operations teams  
**Content**: Performance requirements (2-second page loads, 500 concurrent users), security measures (XSS protection, malware scanning), scalability (10,000 users support), data retention (indefinite article retention, 30-day audit logs), disaster recovery (4-hour recovery time), and operational metrics.

### 7. [Deployment and Operations Document](./07-deployment-operations.md)
**Purpose**: Deployment procedures and operational guidelines  
**Audience**: DevOps and system administrators  
**Content**: Deployment requirements, monitoring needs, maintenance tasks, backup procedures, and scalability guidelines with focus on cloud-native architecture and automated operations.

### 8. [This Table of Contents Document](./00-toc.md)
**Purpose**: Complete documentation navigation and structure overview  
**Audience**: All stakeholders  
**Content**: Document roadmap, reading order, project context, and guidance for different user types navigating the documentation set.

## Reading Order

The recommended reading sequence follows a natural progression from vision to implementation:

1. **Start Here** → This Table of Contents document
2. **[Service Overview](./01-service-overview.md)** → Understanding the "why" and "what"
3. **[User Actors](./03-user-actors.md)** → Understanding "who" will use the system
4. **[Functional Requirements](./02-functional-requirements.md)** → Understanding "what" the system must do
5. **[User Scenarios](./04-user-scenarios.md)** → Understanding "how" users interact
6. **[Business Rules](./05-business-rules.md)** → Understanding constraints and policies
7. **[Technical Requirements](./06-technical-requirements.md)** → Understanding technical constraints
8. **[Deployment Operations](./07-deployment-operations.md)** → Understanding implementation and operations

## Document Interdependencies

- **Service Overview** builds foundation for understanding the market need that drives all functional requirements
- **Functional Requirements** references user actors defined in User Actors document (Member permissions for article creation, Moderator permissions for content review)
- **User Actors** document implements authentication mechanisms described in Technical Requirements (JWT tokens, session management)
- **User Scenarios** validates functional requirements by showing real-world examples of moderation workflows, attachment uploads, and error recovery
- **Business Rules** enforces content standards that functional requirements implement (50-character minimum for articles, 100-character minimum for comments)
- **Technical Requirements** sets performance targets that functional requirements must meet (2-second response times during article creation and editing)
- All documents reference each other to maintain consistency and avoid duplication

### Example Interconnection:
WHEN a Member uploads an image (User Scenarios), THE Functional Requirements require size validation (5MB max), THE Business Rules specify accepted formats (JPEG/PNG/GIF), THE Technical Requirements set performance constraints (200ms validation), and THE User Actors define authentication boundaries (Member role) - creating a complete requirement specification without ambiguity.

## Target Audience

### Business Stakeholders
**Read**: Table of Contents, Service Overview, Deployment Operations  
**Use**: High-level understanding and decision-making about market opportunity, revenue potential, and operational requirements. Focus on market analysis from Service Overview showing 10,000 user growth potential within first year.

### Product Managers
**Read**: Service Overview, User Scenarios, Business Rules, User Actors  
**Use**: Product planning and feature prioritization. Focus on user journey documentation showing complete pathways for article creation, content engagement, and moderation workflows. Understand content policies for economic/political discussions and attachment handling.

### Development Team (Primary Audience)
**Read**: All documents, with focus on Functional Requirements (primary reference), User Actors (authentication), Business Rules (validation), Technical Requirements (constraints)  
**Use**: System design and implementation. Use Functional Requirements as primary implementation reference with EARS format requirements. Understand authentication flows, permission matrices, content validation rules, and technical performance targets.

### System Administrators
**Read**: Technical Requirements, Deployment Operations, Business Rules  
**Use**: Infrastructure planning and system maintenance. Focus on performance targets (500 concurrent users, 2-second response times), security requirements (XSS protection, malware scanning), backup procedures, and scalability guidelines.

### Quality Assurance
**Read**: All documents, focus on Functional Requirements and Business Rules  **Use**: Test planning and validation. Use EARS formatted requirements for test case creation. Focus on edge cases defined in Business Rules (content rules, moderation policies) and User Scenarios (error recovery, upload failures).

### Community Managers
**Read**: Business Rules, User Scenarios, Functional Requirements  
**Use**: Community guideline enforcement and user support. Focus on content policies, moderation workflows, user conduct standards, and escalation procedures for handling violations.

## Document Philosophy

This documentation set follows a requirements-first approach, where:
- Business needs drive technical decisions, not the other way around
- User experience guides system design choices
- Simplicity guides implementation decisions (explicit request from stakeholder)
- Technical teams maintain implementation autonomy within defined business requirements
- Complete requirements avoid ambiguous "should" statements through EARS format

### Requirements-First vs Implementation-First
Unlike typical development projects that start with technology choices, this project begins with complete business requirements that allow TypeScript/NestJS/Prisma implementation without revisiting functional decisions. The requirements specify WHAT the system must do, leaving HOW to the technical team's expertise.

### Philosophy Benefits:
- Prevents technology selection from limiting business functionality
- Enables single-pass development without iterative requirement gathering
- Allows technical team to optimize implementation within clear constraints
- Provides complete specification for cost and timeline estimation
- Eliminates ambiguity that causes project delays or scope creep

## Documentation Standards

- **EARS Format**: All requirements use EARS format (When/The/If/Then) for unambiguous specification
- **Cross-References**: All documents cross-reference related requirements through specific section references
- **Business Language**: Technical constraints are expressed in business terms (response times, user counts) rather than technical specifications
- **Complete Coverage**: Every feature includes validation rules, error handling, and user feedback requirements
- **Implementation Independence**: Requirements specify what users experience, not technical implementation details

## Quick Reference for Different Users

### For New Team Members
Start with Service Overview → User Actors → Functional Requirements. This sequence provides context, actors, then actions in logical progression.

### For Feature Planning
Reference User Scenarios for real-world usage patterns, validate against Business Rules for constraints, check Functional Requirements for implementation scope.

### For Technical Debt Prioritization
Technical Requirements provides performance targets, User Actors shows authentication complexity, Business Rules reveals content processing requirements that may need optimization.

This table of contents serves as the entry point for understanding the politicsBbs requirements documentation, where business requirements drive technical decisions and ensure successful implementation of a focused economic/political discussion platform.

---

> *Developer Note: This document defines business requirements only. All technical implementations (architecture, APIs, database design) are at the discretion of the development team. This documentation is WHAT to build, not HOW to build it.*