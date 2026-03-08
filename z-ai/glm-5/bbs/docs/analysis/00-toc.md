### Table of Contents

**discussionBoard** is a backend service with the following actors and domain entities.

**Actors**: guest, member, admin
**Entities**: User, Section, Article, Comment, Attachment, AdminRequest

---

**Scope**

- **User**: email, password, displayName, bio, banned, banReason, adminGrade | Relationships: has many Articles as author, has many Comments as author, has many AdminRequests as requester
- **Section**: name, description | Relationships: has many Articles
- **Article**: title, content, tags, createdAt | Relationships: belongs to User as author, belongs to Section, has many Comments, has many Attachments
- **Comment**: content, createdAt | Relationships: belongs to User as author, belongs to Article
- **Attachment**: type (file or image), createdAt | Relationships: belongs to Article
- **AdminRequest**: reason, status (pending/approved/rejected), createdAt | Relationships: belongs to User as requester, reviewed by User (super admin)

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
  - [8] [Section Concept](./02-domain-model.md#section-concept) — Describe what Section represents in the business domain, its purpose, and how users interact with it.
  - [9] [Article Concept](./02-domain-model.md#article-concept) — Describe what Article represents in the business domain, its purpose, and how users interact with it.
  - [10] [Comment Concept](./02-domain-model.md#comment-concept) — Describe what Comment represents in the business domain, its purpose, and how users interact with it.
  - [11] [Attachment Concept](./02-domain-model.md#attachment-concept) — Describe what Attachment represents in the business domain, its purpose, and how users interact with it.
  - [12] [AdminRequest Concept](./02-domain-model.md#adminrequest-concept) — Describe what AdminRequest represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [13] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [14] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Enums and State Machines](./02-domain-model.md#enums-and-state-machines)
  - [15] [Enum Definitions](./02-domain-model.md#enum-definitions) — Define all enum types with their allowed values and descriptions.
  - [16] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [17] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [18] [Section Operations](./03-functional-requirements.md#section-operations) — Define business operations for Section: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [19] [Article Operations](./03-functional-requirements.md#article-operations) — Define business operations for Article: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [20] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [21] [Attachment Operations](./03-functional-requirements.md#attachment-operations) — Define business operations for Attachment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [22] [AdminRequest Operations](./03-functional-requirements.md#adminrequest-operations) — Define business operations for AdminRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [23] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective.
  - [24] [Section Actions](./03-functional-requirements.md#section-actions) — Define business actions and workflows for the Section domain group from a functional requirements perspective.
  - [25] [Article Actions](./03-functional-requirements.md#article-actions) — Define business actions and workflows for the Article domain group from a functional requirements perspective.
  - [26] [Comment Actions](./03-functional-requirements.md#comment-actions) — Define business actions and workflows for the Comment domain group from a functional requirements perspective.
  - [27] [Attachment Actions](./03-functional-requirements.md#attachment-actions) — Define business actions and workflows for the Attachment domain group from a functional requirements perspective.
  - [28] [AdminRequest Actions](./03-functional-requirements.md#adminrequest-actions) — Define business actions and workflows for the AdminRequest domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [29] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [30] [Section Error Scenarios](./03-functional-requirements.md#section-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Section operations.
  - [31] [Article Error Scenarios](./03-functional-requirements.md#article-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Article operations.
  - [32] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations.
  - [33] [Attachment Error Scenarios](./03-functional-requirements.md#attachment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Attachment operations.
  - [34] [AdminRequest Error Scenarios](./03-functional-requirements.md#adminrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdminRequest operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [35] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective.
  - [36] [Section User Scenarios](./03-functional-requirements.md#section-user-scenarios) — Define end-to-end user scenarios involving Section and related concepts, describing business flows from the user's perspective.
  - [37] [Article User Scenarios](./03-functional-requirements.md#article-user-scenarios) — Define end-to-end user scenarios involving Article and related concepts, describing business flows from the user's perspective.
  - [38] [Comment User Scenarios](./03-functional-requirements.md#comment-user-scenarios) — Define end-to-end user scenarios involving Comment and related concepts, describing business flows from the user's perspective.
  - [39] [Attachment User Scenarios](./03-functional-requirements.md#attachment-user-scenarios) — Define end-to-end user scenarios involving Attachment and related concepts, describing business flows from the user's perspective.
  - [40] [AdminRequest User Scenarios](./03-functional-requirements.md#adminrequest-user-scenarios) — Define end-to-end user scenarios involving AdminRequest and related concepts, describing business flows from the user's perspective.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [41] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [42] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [43] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User.
  - [44] [Section Rules](./04-business-rules.md#section-rules) — Define business rules, validation logic, and domain constraints for Section.
  - [45] [Article Rules](./04-business-rules.md#article-rules) — Define business rules, validation logic, and domain constraints for Article.
  - [46] [Comment Rules](./04-business-rules.md#comment-rules) — Define business rules, validation logic, and domain constraints for Comment.
  - [47] [Attachment Rules](./04-business-rules.md#attachment-rules) — Define business rules, validation logic, and domain constraints for Attachment.
  - [48] [AdminRequest Rules](./04-business-rules.md#adminrequest-rules) — Define business rules, validation logic, and domain constraints for AdminRequest.
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [49] [User Validation Rules](./04-business-rules.md#user-validation-rules) — Define validation rules for User, including boundary values and format requirements.
  - [50] [Section Validation Rules](./04-business-rules.md#section-validation-rules) — Define validation rules for Section, including boundary values and format requirements.
  - [51] [Article Validation Rules](./04-business-rules.md#article-validation-rules) — Define validation rules for Article, including boundary values and format requirements.
  - [52] [Comment Validation Rules](./04-business-rules.md#comment-validation-rules) — Define validation rules for Comment, including boundary values and format requirements.
  - [53] [Attachment Validation Rules](./04-business-rules.md#attachment-validation-rules) — Define validation rules for Attachment, including boundary values and format requirements.
  - [54] [AdminRequest Validation Rules](./04-business-rules.md#adminrequest-validation-rules) — Define validation rules for AdminRequest, including boundary values and format requirements.
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [55] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [56] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [57] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [58] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [59] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [60] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [61] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [62] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [63] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [64] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [65] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [66] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **User**: email, password, displayName, bio, banned, banReason, adminGrade
- **Section**: name, description
- **Article**: title, content, tags, createdAt
- **Comment**: content, createdAt
- **Attachment**: type (file or image), createdAt
- **AdminRequest**: reason, status (pending/approved/rejected), createdAt

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