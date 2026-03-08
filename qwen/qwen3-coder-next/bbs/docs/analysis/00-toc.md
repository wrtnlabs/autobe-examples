### Table of Contents

**discussionBoard** is a backend service with the following actors and domain entities.

**Actors**: guest, member, admin, superAdmin
**Entities**: User, Section, Article, Comment, FileAttachment, Tag, ArticleTag, AdministratorRequest, BanRecord

---

**Scope**

- **User**: email: text, required, password: text, required, displayName: text(1-100), required, bio: text, optional, role: enum(guest, member, admin, superAdmin), required, isBanned: boolean, required, banReason: text, optional | Relationships: writes Article, writes Comment, creates AdministratorRequest, creates Section (admins only), bans User (admins only)
- **Section**: name: text(1-100), required, description: text, required | Relationships: has many Article, created by User (admins only)
- **Article**: title: text(1-500), required, content: text, required, createdAt: datetime, required, updatedAt: datetime, optional | Relationships: belongs to User (author), belongs to Section, has many Comment, has many FileAttachment, has many ArticleTag
- **Comment**: content: text, required, createdAt: datetime, required, updatedAt: datetime, optional | Relationships: belongs to User (author), belongs to Article
- **FileAttachment**: fileName: text, required, fileUrl: text, required, fileSize: number, required, fileType: text, required, uploadedAt: datetime, required | Relationships: belongs to Article
- **Tag**: name: text(1-50), required | Relationships: has many ArticleTag
- **ArticleTag**: assignedAt: datetime, required | Relationships: belongs to Article, belongs to Tag
- **AdministratorRequest**: reason: text, required, status: enum(pending, approved, rejected), required, submittedAt: datetime, required, processedAt: datetime, optional, rejectionReason: text, optional | Relationships: created by User, processed by User (superAdmin)
- **BanRecord**: banReason: text, required, bannedAt: datetime, required, unbannedAt: datetime, optional, unbanReason: text, optional | Relationships: applies to User, created by User (admin)

- **guest** (guest)
- **member** (member)
- **admin** (admin)
- **superAdmin** (admin)

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
  - [4] [superAdmin Actor](./01-actors-and-auth.md#superadmin-actor) — Define the superAdmin actor's role and capabilities in business terms.
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [5] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [6] [Session and Token Policy](./01-actors-and-auth.md#session-and-token-policy) — Define session duration, token refresh, and expiration policies.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [7] [Account States and Transitions](./01-actors-and-auth.md#account-states-and-transitions) — Define account states (active, suspended, deleted) and valid transitions.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [8] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain, its purpose, and how users interact with it.
  - [9] [Section Concept](./02-domain-model.md#section-concept) — Describe what Section represents in the business domain, its purpose, and how users interact with it.
  - [10] [Article Concept](./02-domain-model.md#article-concept) — Describe what Article represents in the business domain, its purpose, and how users interact with it.
  - [11] [Comment Concept](./02-domain-model.md#comment-concept) — Describe what Comment represents in the business domain, its purpose, and how users interact with it.
  - [12] [FileAttachment Concept](./02-domain-model.md#fileattachment-concept) — Describe what FileAttachment represents in the business domain, its purpose, and how users interact with it.
  - [13] [Tag Concept](./02-domain-model.md#tag-concept) — Describe what Tag represents in the business domain, its purpose, and how users interact with it.
  - [14] [ArticleTag Concept](./02-domain-model.md#articletag-concept) — Describe what ArticleTag represents in the business domain, its purpose, and how users interact with it.
  - [15] [AdministratorRequest Concept](./02-domain-model.md#administratorrequest-concept) — Describe what AdministratorRequest represents in the business domain, its purpose, and how users interact with it.
  - [16] [BanRecord Concept](./02-domain-model.md#banrecord-concept) — Describe what BanRecord represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [17] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [18] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Enums and State Machines](./02-domain-model.md#enums-and-state-machines)
  - [19] [Enum Definitions](./02-domain-model.md#enum-definitions) — Define all enum types with their allowed values and descriptions.
  - [20] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [21] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [22] [Section Operations](./03-functional-requirements.md#section-operations) — Define business operations for Section: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [23] [Article Operations](./03-functional-requirements.md#article-operations) — Define business operations for Article: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [24] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [FileAttachment Operations](./03-functional-requirements.md#fileattachment-operations) — Define business operations for FileAttachment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [Tag Operations](./03-functional-requirements.md#tag-operations) — Define business operations for Tag: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [ArticleTag Operations](./03-functional-requirements.md#articletag-operations) — Define business operations for ArticleTag: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [AdministratorRequest Operations](./03-functional-requirements.md#administratorrequest-operations) — Define business operations for AdministratorRequest: what create, read, update, and list operations must accomplish from a business perspective.
  - [29] [BanRecord Operations](./03-functional-requirements.md#banrecord-operations) — Define business operations for BanRecord: what create, read, update, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [30] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective.
  - [31] [Section Actions](./03-functional-requirements.md#section-actions) — Define business actions and workflows for the Section domain group from a functional requirements perspective.
  - [32] [Article Actions](./03-functional-requirements.md#article-actions) — Define business actions and workflows for the Article domain group from a functional requirements perspective.
  - [33] [Comment Actions](./03-functional-requirements.md#comment-actions) — Define business actions and workflows for the Comment domain group from a functional requirements perspective.
  - [34] [FileAttachment Actions](./03-functional-requirements.md#fileattachment-actions) — Define business actions and workflows for the FileAttachment domain group from a functional requirements perspective.
  - [35] [Tag Actions](./03-functional-requirements.md#tag-actions) — Define business actions and workflows for the Tag domain group from a functional requirements perspective.
  - [36] [ArticleTag Actions](./03-functional-requirements.md#articletag-actions) — Define business actions and workflows for the ArticleTag domain group from a functional requirements perspective.
  - [37] [AdministratorRequest Actions](./03-functional-requirements.md#administratorrequest-actions) — Define business actions and workflows for the AdministratorRequest domain group from a functional requirements perspective.
  - [38] [BanRecord Actions](./03-functional-requirements.md#banrecord-actions) — Define business actions and workflows for the BanRecord domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [39] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [40] [Section Error Scenarios](./03-functional-requirements.md#section-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Section operations.
  - [41] [Article Error Scenarios](./03-functional-requirements.md#article-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Article operations.
  - [42] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations.
  - [43] [FileAttachment Error Scenarios](./03-functional-requirements.md#fileattachment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all FileAttachment operations.
  - [44] [Tag Error Scenarios](./03-functional-requirements.md#tag-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Tag operations.
  - [45] [ArticleTag Error Scenarios](./03-functional-requirements.md#articletag-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ArticleTag operations.
  - [46] [AdministratorRequest Error Scenarios](./03-functional-requirements.md#administratorrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdministratorRequest operations.
  - [47] [BanRecord Error Scenarios](./03-functional-requirements.md#banrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all BanRecord operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [48] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective.
  - [49] [Section User Scenarios](./03-functional-requirements.md#section-user-scenarios) — Define end-to-end user scenarios involving Section and related concepts, describing business flows from the user's perspective.
  - [50] [Article User Scenarios](./03-functional-requirements.md#article-user-scenarios) — Define end-to-end user scenarios involving Article and related concepts, describing business flows from the user's perspective.
  - [51] [Comment User Scenarios](./03-functional-requirements.md#comment-user-scenarios) — Define end-to-end user scenarios involving Comment and related concepts, describing business flows from the user's perspective.
  - [52] [FileAttachment User Scenarios](./03-functional-requirements.md#fileattachment-user-scenarios) — Define end-to-end user scenarios involving FileAttachment and related concepts, describing business flows from the user's perspective.
  - [53] [Tag User Scenarios](./03-functional-requirements.md#tag-user-scenarios) — Define end-to-end user scenarios involving Tag and related concepts, describing business flows from the user's perspective.
  - [54] [ArticleTag User Scenarios](./03-functional-requirements.md#articletag-user-scenarios) — Define end-to-end user scenarios involving ArticleTag and related concepts, describing business flows from the user's perspective.
  - [55] [AdministratorRequest User Scenarios](./03-functional-requirements.md#administratorrequest-user-scenarios) — Define end-to-end user scenarios involving AdministratorRequest and related concepts, describing business flows from the user's perspective.
  - [56] [BanRecord User Scenarios](./03-functional-requirements.md#banrecord-user-scenarios) — Define end-to-end user scenarios involving BanRecord and related concepts, describing business flows from the user's perspective.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [57] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [58] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [59] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User.
  - [60] [Section Rules](./04-business-rules.md#section-rules) — Define business rules, validation logic, and domain constraints for Section.
  - [61] [Article Rules](./04-business-rules.md#article-rules) — Define business rules, validation logic, and domain constraints for Article.
  - [62] [Comment Rules](./04-business-rules.md#comment-rules) — Define business rules, validation logic, and domain constraints for Comment.
  - [63] [FileAttachment Rules](./04-business-rules.md#fileattachment-rules) — Define business rules, validation logic, and domain constraints for FileAttachment.
  - [64] [Tag Rules](./04-business-rules.md#tag-rules) — Define business rules, validation logic, and domain constraints for Tag.
  - [65] [ArticleTag Rules](./04-business-rules.md#articletag-rules) — Define business rules, validation logic, and domain constraints for ArticleTag.
  - [66] [AdministratorRequest Rules](./04-business-rules.md#administratorrequest-rules) — Define business rules, validation logic, and domain constraints for AdministratorRequest.
  - [67] [BanRecord Rules](./04-business-rules.md#banrecord-rules) — Define business rules, validation logic, and domain constraints for BanRecord.
  - [68] [General Domain Constraints](./04-business-rules.md#general-domain-constraints) — Define cross-cutting business rules, validation logic, and domain constraints across the system.
  - [69] [User Permissions and Access Control](./04-business-rules.md#user-permissions-and-access-control) — Define business rules, validation logic, and domain constraints for user permissions and access control.
  - [70] [Content Lifecycle Rules](./04-business-rules.md#content-lifecycle-rules) — Define business rules, validation logic, and domain constraints for content lifecycle management.
  - [71] [Search and Discovery Rules](./04-business-rules.md#search-and-discovery-rules) — Define business rules, validation logic, and domain constraints for search and discovery functionality.
  - [72] [Administrator Operations Rules](./04-business-rules.md#administrator-operations-rules) — Define business rules, validation logic, and domain constraints for administrator operations.
  - [73] [Profile and User Experience Rules](./04-business-rules.md#profile-and-user-experience-rules) — Define business rules, validation logic, and domain constraints for profile and user experience.
  - [74] [Error Handling and Validation Rules](./04-business-rules.md#error-handling-and-validation-rules) — Define business rules, validation logic, and domain constraints for error handling and validation.
  - [75] [Data Consistency Rules](./04-business-rules.md#data-consistency-rules) — Define business rules, validation logic, and domain constraints for data consistency and integrity.
  - [76] [Content Display and Presentation Rules](./04-business-rules.md#content-display-and-presentation-rules) — Define business rules, validation logic, and domain constraints for content display and presentation.
  - [77] [Time and Date Rules](./04-business-rules.md#time-and-date-rules) — Define business rules, validation logic, and domain constraints for time and date handling.
  - [78] [Access Pattern Rules](./04-business-rules.md#access-pattern-rules) — Define business rules, validation logic, and domain constraints for access patterns and usage limits.
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [79] [User Validation Rules](./04-business-rules.md#user-validation-rules) — Define validation rules for User, including boundary values and format requirements.
  - [80] [Section Validation Rules](./04-business-rules.md#section-validation-rules) — Define validation rules for Section, including boundary values and format requirements.
  - [81] [Article Validation Rules](./04-business-rules.md#article-validation-rules) — Define validation rules for Article, including boundary values and format requirements.
  - [82] [Comment Validation Rules](./04-business-rules.md#comment-validation-rules) — Define validation rules for Comment, including boundary values and format requirements.
  - [83] [FileAttachment Validation Rules](./04-business-rules.md#fileattachment-validation-rules) — Define validation rules for FileAttachment, including boundary values and format requirements.
  - [84] [Tag Validation Rules](./04-business-rules.md#tag-validation-rules) — Define validation rules for Tag, including boundary values and format requirements.
  - [85] [ArticleTag Validation Rules](./04-business-rules.md#articletag-validation-rules) — Define validation rules for ArticleTag, including boundary values and format requirements.
  - [86] [AdministratorRequest Validation Rules](./04-business-rules.md#administratorrequest-validation-rules) — Define validation rules for AdministratorRequest, including boundary values and format requirements.
  - [87] [BanRecord Validation Rules](./04-business-rules.md#banrecord-validation-rules) — Define validation rules for BanRecord, including boundary values and format requirements.
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [88] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [89] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [90] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [91] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [92] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [93] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [94] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [95] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [96] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [97] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [98] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [99] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **User**: email: text, required, password: text, required, displayName: text(1-100), required, bio: text, optional, role: enum(guest, member, admin, superAdmin), required, isBanned: boolean, required, banReason: text, optional
- **Section**: name: text(1-100), required, description: text, required
- **Article**: title: text(1-500), required, content: text, required, createdAt: datetime, required, updatedAt: datetime, optional
- **Comment**: content: text, required, createdAt: datetime, required, updatedAt: datetime, optional
- **FileAttachment**: fileName: text, required, fileUrl: text, required, fileSize: number, required, fileType: text, required, uploadedAt: datetime, required
- **Tag**: name: text(1-50), required
- **ArticleTag**: assignedAt: datetime, required
- **AdministratorRequest**: reason: text, required, status: enum(pending, approved, rejected), required, submittedAt: datetime, required, processedAt: datetime, optional, rejectionReason: text, optional
- **BanRecord**: banReason: text, required, bannedAt: datetime, required, unbannedAt: datetime, optional, unbanReason: text, optional

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