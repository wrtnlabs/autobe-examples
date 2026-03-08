### Table of Contents

**discussionBoard** is a backend service with the following actors and domain entities.

**Actors**: guest, member, admin
**Entities**: User, Section, Article, Comment, FileAttachment, ImageAttachment, AdminRequest, BanRecord

---

**Scope**

- **User**: display name, bio, email, password hash, ban status, ban reason | Relationships: writes Articles, writes Comments, can be banned, can request admin access
- **Section**: name, description, created by admin | Relationships: contains Articles, managed by Admin
- **Article**: title, content, tags, attachments, created at, updated at | Relationships: belongs to Section, written by User, has Comments, has File attachments, has Image attachments
- **Comment**: content, created at, updated at | Relationships: belongs to Article, written by User
- **FileAttachment**: filename, file path, file size, upload date | Relationships: attached to Article, uploaded by User
- **ImageAttachment**: filename, image path, file size, upload date | Relationships: attached to Article, uploaded by User
- **AdminRequest**: reason, status, submitted at, reviewed at | Relationships: submitted by User, reviewed by Super Admin
- **BanRecord**: reason, banned at, banned by | Relationships: applies to User, created by Admin

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
  - [11] [FileAttachment Concept](./02-domain-model.md#fileattachment-concept) — Describe what FileAttachment represents in the business domain, its purpose, and how users interact with it.
  - [12] [ImageAttachment Concept](./02-domain-model.md#imageattachment-concept) — Describe what ImageAttachment represents in the business domain, its purpose, and how users interact with it.
  - [13] [AdminRequest Concept](./02-domain-model.md#adminrequest-concept) — Describe what AdminRequest represents in the business domain, its purpose, and how users interact with it.
  - [14] [BanRecord Concept](./02-domain-model.md#banrecord-concept) — Describe what BanRecord represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [15] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [16] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Enums and State Machines](./02-domain-model.md#enums-and-state-machines)
  - [17] [Enum Definitions](./02-domain-model.md#enum-definitions) — Define all enum types with their allowed values and descriptions.
  - [18] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [19] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [20] [Section Operations](./03-functional-requirements.md#section-operations) — Define business operations for Section: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [21] [Article Operations](./03-functional-requirements.md#article-operations) — Define business operations for Article: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [22] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [23] [FileAttachment Operations](./03-functional-requirements.md#fileattachment-operations) — Define business operations for FileAttachment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [24] [ImageAttachment Operations](./03-functional-requirements.md#imageattachment-operations) — Define business operations for ImageAttachment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [AdminRequest Operations](./03-functional-requirements.md#adminrequest-operations) — Define business operations for AdminRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [BanRecord Operations](./03-functional-requirements.md#banrecord-operations) — Define business operations for BanRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [27] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective.
  - [28] [Section Actions](./03-functional-requirements.md#section-actions) — Define business actions and workflows for the Section domain group from a functional requirements perspective.
  - [29] [Article Actions](./03-functional-requirements.md#article-actions) — Define business actions and workflows for the Article domain group from a functional requirements perspective.
  - [30] [Comment Actions](./03-functional-requirements.md#comment-actions) — Define business actions and workflows for the Comment domain group from a functional requirements perspective.
  - [31] [FileAttachment Actions](./03-functional-requirements.md#fileattachment-actions) — Define business actions and workflows for the FileAttachment domain group from a functional requirements perspective.
  - [32] [ImageAttachment Actions](./03-functional-requirements.md#imageattachment-actions) — Define business actions and workflows for the ImageAttachment domain group from a functional requirements perspective.
  - [33] [AdminRequest Actions](./03-functional-requirements.md#adminrequest-actions) — Define business actions and workflows for the AdminRequest domain group from a functional requirements perspective.
  - [34] [BanRecord Actions](./03-functional-requirements.md#banrecord-actions) — Define business actions and workflows for the BanRecord domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [35] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [36] [Section Error Scenarios](./03-functional-requirements.md#section-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Section operations.
  - [37] [Article Error Scenarios](./03-functional-requirements.md#article-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Article operations.
  - [38] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations.
  - [39] [FileAttachment Error Scenarios](./03-functional-requirements.md#fileattachment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all FileAttachment operations.
  - [40] [ImageAttachment Error Scenarios](./03-functional-requirements.md#imageattachment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ImageAttachment operations.
  - [41] [AdminRequest Error Scenarios](./03-functional-requirements.md#adminrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdminRequest operations.
  - [42] [BanRecord Error Scenarios](./03-functional-requirements.md#banrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all BanRecord operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [43] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective.
  - [44] [Section User Scenarios](./03-functional-requirements.md#section-user-scenarios) — Define end-to-end user scenarios involving Section and related concepts, describing business flows from the user's perspective.
  - [45] [Article User Scenarios](./03-functional-requirements.md#article-user-scenarios) — Define end-to-end user scenarios involving Article and related concepts, describing business flows from the user's perspective.
  - [46] [Comment User Scenarios](./03-functional-requirements.md#comment-user-scenarios) — Define end-to-end user scenarios involving Comment and related concepts, describing business flows from the user's perspective.
  - [47] [FileAttachment User Scenarios](./03-functional-requirements.md#fileattachment-user-scenarios) — Define end-to-end user scenarios involving FileAttachment and related concepts, describing business flows from the user's perspective.
  - [48] [ImageAttachment User Scenarios](./03-functional-requirements.md#imageattachment-user-scenarios) — Define end-to-end user scenarios involving ImageAttachment and related concepts, describing business flows from the user's perspective.
  - [49] [AdminRequest User Scenarios](./03-functional-requirements.md#adminrequest-user-scenarios) — Define end-to-end user scenarios involving AdminRequest and related concepts, describing business flows from the user's perspective.
  - [50] [BanRecord User Scenarios](./03-functional-requirements.md#banrecord-user-scenarios) — Define end-to-end user scenarios involving BanRecord and related concepts, describing business flows from the user's perspective.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [51] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [52] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [53] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User.
  - [54] [Section Rules](./04-business-rules.md#section-rules) — Define business rules, validation logic, and domain constraints for Section.
  - [55] [Article Rules](./04-business-rules.md#article-rules) — Define business rules, validation logic, and domain constraints for Article.
  - [56] [Comment Rules](./04-business-rules.md#comment-rules) — Define business rules, validation logic, and domain constraints for Comment.
  - [57] [FileAttachment Rules](./04-business-rules.md#fileattachment-rules) — Define business rules, validation logic, and domain constraints for FileAttachment.
  - [58] [ImageAttachment Rules](./04-business-rules.md#imageattachment-rules) — Define business rules, validation logic, and domain constraints for ImageAttachment.
  - [59] [AdminRequest Rules](./04-business-rules.md#adminrequest-rules) — Define business rules, validation logic, and domain constraints for AdminRequest.
  - [60] [BanRecord Rules](./04-business-rules.md#banrecord-rules) — Define business rules, validation logic, and domain constraints for BanRecord.
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [61] [User Validation Rules](./04-business-rules.md#user-validation-rules) — Define validation rules for User, including boundary values and format requirements.
  - [62] [Section Validation Rules](./04-business-rules.md#section-validation-rules) — Define validation rules for Section, including boundary values and format requirements.
  - [63] [Article Validation Rules](./04-business-rules.md#article-validation-rules) — Define validation rules for Article, including boundary values and format requirements.
  - [64] [Comment Validation Rules](./04-business-rules.md#comment-validation-rules) — Define validation rules for Comment, including boundary values and format requirements.
  - [65] [FileAttachment Validation Rules](./04-business-rules.md#fileattachment-validation-rules) — Define validation rules for FileAttachment, including boundary values and format requirements.
  - [66] [ImageAttachment Validation Rules](./04-business-rules.md#imageattachment-validation-rules) — Define validation rules for ImageAttachment, including boundary values and format requirements.
  - [67] [AdminRequest Validation Rules](./04-business-rules.md#adminrequest-validation-rules) — Define validation rules for AdminRequest, including boundary values and format requirements.
  - [68] [BanRecord Validation Rules](./04-business-rules.md#banrecord-validation-rules) — Define validation rules for BanRecord, including boundary values and format requirements.
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [69] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [70] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [71] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [72] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [73] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [74] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [75] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [76] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [77] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [78] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [79] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [80] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **User**: display name, bio, email, password hash, ban status, ban reason
- **Section**: name, description, created by admin
- **Article**: title, content, tags, attachments, created at, updated at
- **Comment**: content, created at, updated at
- **FileAttachment**: filename, file path, file size, upload date
- **ImageAttachment**: filename, image path, file size, upload date
- **AdminRequest**: reason, status, submitted at, reviewed at
- **BanRecord**: reason, banned at, banned by

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