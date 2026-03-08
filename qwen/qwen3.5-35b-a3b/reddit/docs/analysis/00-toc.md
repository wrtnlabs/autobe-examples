### Table of Contents

**redditPlatform** is a backend service with the following actors and domain entities.

**Actors**: guest, member, admin
**Entities**: User, Post, Comment, Community, Vote, Report

---

**Scope**

- **User**: username: unique string, email: string, displayName: string, bio: text, avatarUrl: string, karmaScore: number | Relationships: owns posts, writes comments, subscribes to communities, votes on posts and comments, reports content
- **Post**: title: string, content: text, type: text|link|image, url: string (for link posts), imageUrl: string (for image posts), score: number | Relationships: belongs to community, belongs to user as author, has many comments, has many votes
- **Comment**: content: text, score: number | Relationships: belongs to post, belongs to user as author, can have nested replies, has many votes
- **Community**: name: unique string, description: text, iconUrl: string, subscriberCount: number | Relationships: has many posts, has many subscribers, has moderators, has banned users
- **Vote**: voteType: upvote|downvote | Relationships: belongs to user, belongs to post or comment, votes on posts or comments
- **Report**: reason: text, status: pending|resolved|dismissed | Relationships: belongs to user who reported, belongs to reported post or comment, belongs to community

- **guest** (guest)
- **member** (member)
- **admin** (admin)

---

**Document Map**

| File | Role | Downstream |
|------|------|------------|
| [00-toc.md](./00-toc.md) | Project summary, scope, glossary, and assumptions | project-setup |
| [01-actors-and-auth.md](./01-actors-and-auth.md) | Actor definitions, permission matrix, authentication, session, account lifecycle | auth-middleware |
| [02-domain-model.md](./02-domain-model.md) | Business concepts, relationships, and states from user perspective | database-design |
| [03-functional-requirements.md](./03-functional-requirements.md) | What operations users can perform, use cases, business workflows | interface-design |
| [04-business-rules.md](./04-business-rules.md) | Data isolation, business rules, filtering/sorting/pagination, error catalog | service-layer |
| [05-non-functional.md](./05-non-functional.md) | Performance SLOs, security policies, data integrity, storage requirements | test-infra |

**Section Navigation**

<!-- Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })` -->

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [guest Actor](./01-actors-and-auth.md#guest-actor) — Define the guest actor's role and capabilities in business terms.
  - [2] [member Actor](./01-actors-and-auth.md#member-actor) — Define the member actor's role and capabilities in business terms.
  - [3] [admin Actor](./01-actors-and-auth.md#admin-actor) — Define the admin actor's role and capabilities in business terms.
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [4] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [5] [Session and Token Policy](./01-actors-and-auth.md#session-and-token-policy) — Define session duration, token refresh, and expiration policies.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [6] [Account States and Transitions](./01-actors-and-auth.md#account-states-and-transitions) — Define account states (active, suspended, deleted) and valid transitions.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [7] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain, its purpose, and how users interact with it.
  - [8] [Post Concept](./02-domain-model.md#post-concept) — Describe what Post represents in the business domain, its purpose, and how users interact with it.
  - [9] [Comment Concept](./02-domain-model.md#comment-concept) — Describe what Comment represents in the business domain, its purpose, and how users interact with it.
  - [10] [Community Concept](./02-domain-model.md#community-concept) — Describe what Community represents in the business domain, its purpose, and how users interact with it.
  - [11] [Vote Concept](./02-domain-model.md#vote-concept) — Describe what Vote represents in the business domain, its purpose, and how users interact with it.
  - [12] [Report Concept](./02-domain-model.md#report-concept) — Describe what Report represents in the business domain, its purpose, and how users interact with it.
  - [13] [Community Concept](./02-domain-model.md#community-concept-1) — Describe what Community represents in the business domain, its purpose, and how users interact with it.
  - [14] [Vote Concept](./02-domain-model.md#vote-concept-1) — Describe what Vote represents in the business domain, its purpose, and how users interact with it.
  - [15] [Report Concept](./02-domain-model.md#report-concept-1) — Describe what Report represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [16] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [17] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Enums and State Machines](./02-domain-model.md#enums-and-state-machines)
  - [18] [Enum Definitions](./02-domain-model.md#enum-definitions) — Define all enum types with their allowed values and descriptions.
  - [19] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [20] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [21] [Post Operations](./03-functional-requirements.md#post-operations) — Define business operations for Post: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [22] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [23] [Community Operations](./03-functional-requirements.md#community-operations) — Define business operations for Community: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [24] [Vote Operations](./03-functional-requirements.md#vote-operations) — Define business operations for Vote: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [Report Operations](./03-functional-requirements.md#report-operations) — Define business operations for Report: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [26] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective.
  - [27] [Post Actions](./03-functional-requirements.md#post-actions) — Define business actions and workflows for the Post domain group from a functional requirements perspective.
  - [28] [Comment Actions](./03-functional-requirements.md#comment-actions) — Define business actions and workflows for the Comment domain group from a functional requirements perspective.
  - [29] [Community Actions](./03-functional-requirements.md#community-actions) — Define business actions and workflows for the Community domain group from a functional requirements perspective.
  - [30] [Vote Actions](./03-functional-requirements.md#vote-actions) — Define business actions and workflows for the Vote domain group from a functional requirements perspective.
  - [31] [Report Actions](./03-functional-requirements.md#report-actions) — Define business actions and workflows for the Report domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [32] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [33] [Post Error Scenarios](./03-functional-requirements.md#post-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Post operations.
  - [34] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations.
  - [35] [Community Error Scenarios](./03-functional-requirements.md#community-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Community operations.
  - [36] [Vote Error Scenarios](./03-functional-requirements.md#vote-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Vote operations.
  - [37] [Report Error Scenarios](./03-functional-requirements.md#report-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Report operations.
  - [38] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios-1) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [39] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios-2) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [40] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios-3) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [41] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios-4) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [42] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective.
  - [43] [Post User Scenarios](./03-functional-requirements.md#post-user-scenarios) — Define end-to-end user scenarios involving Post and related concepts, describing business flows from the user's perspective.
  - [44] [Comment User Scenarios](./03-functional-requirements.md#comment-user-scenarios) — Define end-to-end user scenarios involving Comment and related concepts, describing business flows from the user's perspective.
  - [45] [Community User Scenarios](./03-functional-requirements.md#community-user-scenarios) — Define end-to-end user scenarios involving Community and related concepts, describing business flows from the user's perspective.
  - [46] [Vote User Scenarios](./03-functional-requirements.md#vote-user-scenarios) — Define end-to-end user scenarios involving Vote and related concepts, describing business flows from the user's perspective.
  - [47] [Report User Scenarios](./03-functional-requirements.md#report-user-scenarios) — Define end-to-end user scenarios involving Report and related concepts, describing business flows from the user's perspective.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [48] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [49] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.
- [Background Processing](./03-functional-requirements.md#background-processing)
  - [50] [Job Specifications](./03-functional-requirements.md#job-specifications) — Define background jobs, queue configurations, retry policies, and scheduling rules for asynchronous processing.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [51] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [52] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User.
  - [53] [Post Rules](./04-business-rules.md#post-rules) — Define business rules, validation logic, and domain constraints for Post.
  - [54] [Comment Rules](./04-business-rules.md#comment-rules) — Define business rules, validation logic, and domain constraints for Comment.
  - [55] [Community Rules](./04-business-rules.md#community-rules) — Define business rules, validation logic, and domain constraints for Community.
  - [56] [Vote Rules](./04-business-rules.md#vote-rules) — Define business rules, validation logic, and domain constraints for Vote.
  - [57] [Report Rules](./04-business-rules.md#report-rules) — Define business rules, validation logic, and domain constraints for Report.
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [58] [User Validation Rules](./04-business-rules.md#user-validation-rules) — Define validation rules for User, including boundary values and format requirements.
  - [59] [Post Validation Rules](./04-business-rules.md#post-validation-rules) — Define validation rules for Post, including boundary values and format requirements.
  - [60] [Comment Validation Rules](./04-business-rules.md#comment-validation-rules) — Define validation rules for Comment, including boundary values and format requirements.
  - [61] [Community Validation Rules](./04-business-rules.md#community-validation-rules) — Define validation rules for Community, including Community, including boundary values and format requirements.
  - [62] [Vote Validation Rules](./04-business-rules.md#vote-validation-rules) — Define validation rules for Vote, including boundary values and format requirements.
  - [63] [Report Validation Rules](./04-business-rules.md#report-validation-rules) — Define validation rules for Report, including boundary values and format requirements.
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [64] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [65] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [66] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [67] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.
- [Job Failure Policies](./04-business-rules.md#job-failure-policies)
  - [68] [Job Failure and Recovery](./04-business-rules.md#job-failure-and-recovery) — Define failure handling, recovery procedures, and notification requirements for background jobs.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [69] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [70] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [71] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [72] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [73] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [74] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [75] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [76] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [77] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [78] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.
- [Queue Performance](./05-non-functional.md#queue-performance)
  - [79] [Queue Performance SLOs](./05-non-functional.md#queue-performance-slos) — Define performance requirements for background job processing.

---

**Canonical Sources**

Each type of information has one authoritative location. Other files should reference these canonical sources.

| Information Type | Canonical File |
|------------------|---------------|
| Domain concepts | [02-domain-model.md](./02-domain-model.md) |
| Error conditions | [04-business-rules.md](./04-business-rules.md) |
| Permissions | [01-actors-and-auth.md](./01-actors-and-auth.md) |
| Actor definitions | [01-actors-and-auth.md](./01-actors-and-auth.md) |

---

**Glossary**

- **User**: username: unique string, email: string, displayName: string, bio: text, avatarUrl: string, karmaScore: number
- **Post**: title: string, content: text, type: text|link|image, url: string (for link posts), imageUrl: string (for image posts), score: number
- **Comment**: content: text, score: number
- **Community**: name: unique string, description: text, iconUrl: string, subscriberCount: number
- **Vote**: voteType: upvote|downvote
- **Report**: reason: text, status: pending|resolved|dismissed

---

**Constraints**

- File scope: Project summary, scope, glossary, and assumptions
- Downstream phase: project-setup
- File scope: Actor definitions, permission matrix, authentication, session, account lifecycle
- Downstream phase: auth-middleware
- File scope: Business concepts, relationships, and states from user perspective
- Downstream phase: database-design
- File scope: What operations users can perform, use cases, business workflows
- Downstream phase: interface-design
- File scope: Data isolation, business rules, filtering/sorting/pagination, error catalog
- Downstream phase: service-layer
- File scope: Performance SLOs, security policies, data integrity, storage requirements
- Downstream phase: test-infra

**Active Features**

- file-storage
- external-integration
- background-processing