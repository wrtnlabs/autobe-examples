### Table of Contents

**communityPlatform** is a backend service with the following actors and domain entities.

**Actors**: guest, member
**Entities**: User, Community, Post, Comment, Vote, Subscription, Report, Ban

---

**Scope**

- **User**: email: string, required, unique, username: string, required, unique, password: string, required, displayName: string, bio: text, avatar: image URL, karma: integer, default 0 | Relationships: creates Posts, writes Comments, creates Communities, subscribes to Communities via Subscription, casts Votes on Posts and Comments, owns Communities, moderates Communities
- **Community**: name: string, required, unique, description: text, required, icon: image URL, subscriberCount: integer, default 0 | Relationships: owned by User (owner), has Posts, has Subscriptions from Users, has Moderators (Users), has Bans for Users
- **Post**: title: string, required, contentType: enum (text/link/image), required, textContent: text, linkUrl: URL, imageUrl: image URL, score: integer, default 0, createdAt: timestamp | Relationships: belongs to Community, created by User (author), has Comments, has Votes from Users, has Reports
- **Comment**: content: text, required, score: integer, default 0, createdAt: timestamp | Relationships: belongs to Post, written by User (author), has nested Replies (self-referential), has Votes from Users, has Reports
- **Vote**: voteType: enum (upvote/downvote), required, createdAt: timestamp | Relationships: cast by User, on Post or Comment
- **Subscription**: subscribedAt: timestamp, isActive: boolean, default true | Relationships: User subscribes to Community
- **Report**: reason: text, required, status: enum (pending/approved/dismissed), default pending, createdAt: timestamp | Relationships: reported by User, on Post or Comment, for Community
- **Ban**: bannedAt: timestamp, reason: text | Relationships: User banned from Community, banned by Moderator (User)

- **guest** (guest)
- **member** (member)

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
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [3] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [4] [Session and Token Policy](./01-actors-and-auth.md#session-and-token-policy) — Define session duration, token refresh, and expiration policies.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [5] [Account States and Transitions](./01-actors-and-auth.md#account-states-and-transitions) — Define account states (active, suspended, deleted) and valid transitions.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [6] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain, its purpose, and how users interact with it.
  - [7] [Community Concept](./02-domain-model.md#community-concept) — Describe what Community represents in the business domain, its purpose, and how users interact with it.
  - [8] [Post Concept](./02-domain-model.md#post-concept) — Describe what Post represents in the business domain, its purpose, and how users interact with it.
  - [9] [Comment Concept](./02-domain-model.md#comment-concept) — Describe what Comment represents in the business domain, its purpose, and how users interact with it.
  - [10] [Vote Concept](./02-domain-model.md#vote-concept) — Describe what Vote represents in the business domain, its purpose, and how users interact with it.
  - [11] [Subscription Concept](./02-domain-model.md#subscription-concept) — Describe what Subscription represents in the business domain, its purpose, and how users interact with it.
  - [12] [Report Concept](./02-domain-model.md#report-concept) — Describe what Report represents in the business domain, its purpose, and how users interact with it.
  - [13] [Ban Concept](./02-domain-model.md#ban-concept) — Describe what Ban represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [14] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [15] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Enums and State Machines](./02-domain-model.md#enums-and-state-machines)
  - [16] [Enum Definitions](./02-domain-model.md#enum-definitions) — Define all enum types with their allowed values and descriptions.
  - [17] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [18] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [19] [Community Operations](./03-functional-requirements.md#community-operations) — Define business operations for Community: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [20] [Post Operations](./03-functional-requirements.md#post-operations) — Define business operations for Post: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [21] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [22] [Vote Operations](./03-functional-requirements.md#vote-operations) — Define business operations for Vote: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [23] [Subscription Operations](./03-functional-requirements.md#subscription-operations) — Define business operations for Subscription: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [24] [Report Operations](./03-functional-requirements.md#report-operations) — Define business operations for Report: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [Ban Operations](./03-functional-requirements.md#ban-operations) — Define business operations for Ban: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [26] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective.
  - [27] [Community Actions](./03-functional-requirements.md#community-actions) — Define business actions and workflows for the Community domain group from a functional requirements perspective.
  - [28] [Post Actions](./03-functional-requirements.md#post-actions) — Define business actions and workflows for the Post domain group from a functional requirements perspective.
  - [29] [Comment Actions](./03-functional-requirements.md#comment-actions) — Define business actions and workflows for the Comment domain group from a functional requirements perspective.
  - [30] [Vote Actions](./03-functional-requirements.md#vote-actions) — Define business actions and workflows for the Vote domain group from a functional requirements perspective.
  - [31] [Subscription Actions](./03-functional-requirements.md#subscription-actions) — Define business actions and workflows for the Subscription domain group from a functional requirements perspective.
  - [32] [Report Actions](./03-functional-requirements.md#report-actions) — Define business actions and workflows for the Report domain group from a functional requirements perspective.
  - [33] [Ban Actions](./03-functional-requirements.md#ban-actions) — Define business actions and workflows for the Ban domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [34] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [35] [Community Error Scenarios](./03-functional-requirements.md#community-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Community operations.
  - [36] [Post Error Scenarios](./03-functional-requirements.md#post-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Post operations.
  - [37] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations.
  - [38] [Vote Error Scenarios](./03-functional-requirements.md#vote-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Vote operations.
  - [39] [Subscription Error Scenarios](./03-functional-requirements.md#subscription-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Subscription operations.
  - [40] [Report Error Scenarios](./03-functional-requirements.md#report-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Report operations.
  - [41] [Ban Error Scenarios](./03-functional-requirements.md#ban-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Ban operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [42] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective.
  - [43] [Community User Scenarios](./03-functional-requirements.md#community-user-scenarios) — Define end-to-end user scenarios involving Community and related concepts, describing business flows from the user's perspective.
  - [44] [Post User Scenarios](./03-functional-requirements.md#post-user-scenarios) — Define end-to-end user scenarios involving Post and related concepts, describing business flows from the user's perspective.
  - [45] [Comment User Scenarios](./03-functional-requirements.md#comment-user-scenarios) — Define end-to-end user scenarios involving Comment and related concepts, describing business flows from the user's perspective.
  - [46] [Vote User Scenarios](./03-functional-requirements.md#vote-user-scenarios) — Define end-to-end user scenarios involving Vote and related concepts, describing business flows from the user's perspective.
  - [47] [Subscription User Scenarios](./03-functional-requirements.md#subscription-user-scenarios) — Define end-to-end user scenarios involving Subscription and related concepts, describing business flows from the user's perspective.
  - [48] [Report User Scenarios](./03-functional-requirements.md#report-user-scenarios) — Define end-to-end user scenarios involving Report and related concepts, describing business flows from the user's perspective.
  - [49] [Ban User Scenarios](./03-functional-requirements.md#ban-user-scenarios) — Define end-to-end user scenarios involving Ban and related concepts, describing business flows from the user's perspective.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [50] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [51] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [52] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User.
  - [53] [Community Rules](./04-business-rules.md#community-rules) — Define business rules, validation logic, and domain constraints for Community.
  - [54] [Post Rules](./04-business-rules.md#post-rules) — Define business rules, validation logic, and domain constraints for Post.
  - [55] [Comment Rules](./04-business-rules.md#comment-rules) — Define business rules, validation logic, and domain constraints for Comment.
  - [56] [Vote Rules](./04-business-rules.md#vote-rules) — Define business rules, validation logic, and domain constraints for Vote.
  - [57] [Subscription Rules](./04-business-rules.md#subscription-rules) — Define business rules, validation logic, and domain constraints for Subscription.
  - [58] [Report Rules](./04-business-rules.md#report-rules) — Define business rules, validation logic, and domain constraints for Report.
  - [59] [Ban Rules](./04-business-rules.md#ban-rules) — Define business rules, validation logic, and domain constraints for Ban.
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [60] [User Validation Rules](./04-business-rules.md#user-validation-rules) — Define validation rules for User, including boundary values and format requirements.
  - [61] [Community Validation Rules](./04-business-rules.md#community-validation-rules) — Define validation rules for Community, including boundary values and format requirements.
  - [62] [Post Validation Rules](./04-business-rules.md#post-validation-rules) — Define validation rules for Post, including boundary values and format requirements.
  - [63] [Comment Validation Rules](./04-business-rules.md#comment-validation-rules) — Define validation rules for Comment, including boundary values and format requirements.
  - [64] [Vote Validation Rules](./04-business-rules.md#vote-validation-rules) — Define validation rules for Vote, including boundary values and format requirements.
  - [65] [Subscription Validation Rules](./04-business-rules.md#subscription-validation-rules) — Define validation rules for Subscription, including boundary values and format requirements.
  - [66] [Report Validation Rules](./04-business-rules.md#report-validation-rules) — Define validation rules for Report, including boundary values and format requirements.
  - [67] [Ban Validation Rules](./04-business-rules.md#ban-validation-rules) — Define validation rules for Ban, including boundary values and format requirements.
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [68] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [69] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [70] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [71] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [72] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [73] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [74] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [75] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [76] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [77] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [78] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [79] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **User**: email: string, required, unique, username: string, required, unique, password: string, required, displayName: string, bio: text, avatar: image URL, karma: integer, default 0
- **Community**: name: string, required, unique, description: text, required, icon: image URL, subscriberCount: integer, default 0
- **Post**: title: string, required, contentType: enum (text/link/image), required, textContent: text, linkUrl: URL, imageUrl: image URL, score: integer, default 0, createdAt: timestamp
- **Comment**: content: text, required, score: integer, default 0, createdAt: timestamp
- **Vote**: voteType: enum (upvote/downvote), required, createdAt: timestamp
- **Subscription**: subscribedAt: timestamp, isActive: boolean, default true
- **Report**: reason: text, required, status: enum (pending/approved/dismissed), default pending, createdAt: timestamp
- **Ban**: bannedAt: timestamp, reason: text

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