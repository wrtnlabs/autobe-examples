### Table of Contents

**economicPoliticalBoard** is a backend service with the following actors and domain entities.

**Actors**: guest, member, admin
**Entities**: User, Profile, Section, Article, Comment, Attachment, Tag, ArticleTag, AdministratorRequest, BanRecord

---

**Scope**

- **User**: email: string, unique, passwordHash: string, createdAt: datetime, updatedAt: datetime, isBanned: boolean, banReason: string?, banAt: datetime?, createdAtAdminId: int? | Relationships: has Profile, owns Article, wrote Comment, submitted AdministratorRequest, has BanRecord
- **Profile**: userId: int, unique, required, displayName: string, required, bio: string | Relationships: belongsTo User via userId
- **Section**: id: int, primary, name: string, required, description: string, createdAt: datetime, updatedAt: datetime, createdByAdminId: int | Relationships: created by Admin, contains Article
- **Article**: id: int, primary, title: string, required, content: text, required, sectionId: int, required, authorId: int, required, createdAt: datetime, updatedAt: datetime, commentCount: int | Relationships: created by User via authorId, belongs to Section via sectionId, has Comment, has Attachment, has Tag
- **Comment**: id: int, primary, content: text, required, authorId: int, required, articleId: int, required, createdAt: datetime, updatedAt: datetime | Relationships: created by User via authorId, belongs to Article via articleId
- **Attachment**: id: int, primary, articleId: int, required, fileName: string, required, fileUrl: string, required, fileType: string, uploadedAt: datetime | Relationships: belongs to Article via articleId
- **Tag**: id: int, primary, name: string, required, unique | Relationships: many-to-many with Article
- **ArticleTag**: articleId: int, required, tagId: int, required | Relationships: belongs to Article via articleId, belongs to Tag via tagId
- **AdministratorRequest**: id: int, primary, userId: int, required, reason: string, required, status: string, required, submittedAt: datetime, reviewedByAdminId: int?, reviewedAt: datetime?, reviewNotes: string? | Relationships: submitted by User via userId, reviewed by Admin via reviewedByAdminId
- **BanRecord**: id: int, primary, userId: int, required, bannedByAdminId: int, required, reason: string, required, createdAt: datetime | Relationships: created by Admin via bannedByAdminId, records ban of User via userId

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
  - [8] [Profile Concept](./02-domain-model.md#profile-concept) — Describe what Profile represents in the business domain, its purpose, and how users interact with it.
  - [9] [Section Concept](./02-domain-model.md#section-concept) — Describe what Section represents in the business domain, its purpose, and how users interact with it.
  - [10] [Article Concept](./02-domain-model.md#article-concept) — Describe what Article represents in the business domain, its purpose, and how users interact with it.
  - [11] [Comment Concept](./02-domain-model.md#comment-concept) — Describe what Comment represents in the business domain, its purpose, and how users interact with it.
  - [12] [Attachment Concept](./02-domain-model.md#attachment-concept) — Describe what Attachment represents in the business domain, its purpose, and how users interact with it.
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
  - [22] [Profile Operations](./03-functional-requirements.md#profile-operations) — Define business operations for Profile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [23] [Section Operations](./03-functional-requirements.md#section-operations) — Define business operations for Section: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [24] [Article Operations](./03-functional-requirements.md#article-operations) — Define business operations for Article: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [Attachment Operations](./03-functional-requirements.md#attachment-operations) — Define business operations for Attachment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [Tag Operations](./03-functional-requirements.md#tag-operations) — Define business operations for Tag: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [ArticleTag Operations](./03-functional-requirements.md#articletag-operations) — Define business operations for ArticleTag: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [AdministratorRequest Operations](./03-functional-requirements.md#administratorrequest-operations) — Define business operations for AdministratorRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [BanRecord Operations](./03-functional-requirements.md#banrecord-operations) — Define business operations for BanRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [31] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective.
  - [32] [Profile Actions](./03-functional-requirements.md#profile-actions) — Define business actions and workflows for the Profile domain group from a functional requirements perspective.
  - [33] [Section Actions](./03-functional-requirements.md#section-actions) — Define business actions and workflows for the Section domain group from a functional requirements perspective.
  - [34] [Article Actions](./03-functional-requirements.md#article-actions) — Define business actions and workflows for the Article domain group from a functional requirements perspective.
  - [35] [Comment Actions](./03-functional-requirements.md#comment-actions) — Define business actions and workflows for the Comment domain group from a functional requirements perspective.
  - [36] [Attachment Actions](./03-functional-requirements.md#attachment-actions) — Define business actions and workflows for the Attachment domain group from a functional requirements perspective.
  - [37] [Tag Actions](./03-functional-requirements.md#tag-actions) — Define business actions and workflows for the Tag domain group from a functional requirements perspective.
  - [38] [ArticleTag Actions](./03-functional-requirements.md#articletag-actions) — Define business actions and workflows for the ArticleTag domain group from a functional requirements perspective.
  - [39] [AdministratorRequest Actions](./03-functional-requirements.md#administratorrequest-actions) — Define business actions and workflows for the AdministratorRequest Actions domain group from a functional requirements perspective.
  - [40] [BanRecord Actions](./03-functional-requirements.md#banrecord-actions) — Define business actions and workflows for the BanRecord domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [41] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [42] [Profile Error Scenarios](./03-functional-requirements.md#profile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Profile operations.
  - [43] [Section Error Scenarios](./03-functional-requirements.md#section-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Section operations.
  - [44] [Article Error Scenarios](./03-functional-requirements.md#article-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Article operations.
  - [45] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations.
  - [46] [Attachment Error Scenarios](./03-functional-requirements.md#attachment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Attachment operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [47] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective.
  - [48] [Profile User Scenarios](./03-functional-requirements.md#profile-user-scenarios) — Define end-to-end user scenarios involving Profile and related concepts, describing business flows from the user's perspective.
  - [49] [Section User Scenarios](./03-functional-requirements.md#section-user-scenarios) — Define end-to-end user scenarios involving Section and related concepts, describing business flows from the user's perspective.
  - [50] [Article User Scenarios](./03-functional-requirements.md#article-user-scenarios) — Define end-to-end user scenarios involving Article and related concepts, describing business flows from the user's perspective.
  - [51] [Comment User Scenarios](./03-functional-requirements.md#comment-user-scenarios) — Define end-to-end user scenarios involving Comment and related concepts, describing business flows from the user's perspective.
  - [52] [Attachment User Scenarios](./03-functional-requirements.md#attachment-user-scenarios) — Define end-to-end user scenarios involving Attachment and related concepts, describing business flows from the user's perspective.
  - [53] [Tag User Scenarios](./03-functional-requirements.md#tag-user-scenarios) — Define end-to-end user scenarios involving Tag and related concepts, describing business flows from the user's perspective.
  - [54] [ArticleTag User Scenarios](./03-functional-requirements.md#articletag-user-scenarios) — Define end-to-end user scenarios involving ArticleTag and related concepts, describing business flows from the user's perspective.
  - [55] [AdministratorRequest User Scenarios](./03-functional-requirements.md#administratorrequest-user-scenarios) — Define end-to-end user scenarios involving AdministratorRequest and related concepts, describing business flows from the user's perspective.
  - [56] [BanRecord User Scenarios](./03-functional-requirements.md#banrecord-user-scenarios) — Define end-to-end user scenarios involving BanRecord User Scenarios
- [File Storage](./03-functional-requirements.md#file-storage)
  - [57] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [58] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [59] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User.
  - [60] [Profile Rules](./04-business-rules.md#profile-rules) — Define business rules, validation logic, and domain constraints for Profile.
  - [61] [Section Rules](./04-business-rules.md#section-rules) — Define business rules, validation logic, and domain constraints for Section.
  - [62] [Article Rules](./04-business-rules.md#article-rules) — Define business rules, validation logic, and domain constraints for Article.
  - [63] [Comment Rules](./04-business-rules.md#comment-rules) — Define business rules, validation logic, and domain constraints for Comment.
  - [64] [Attachment Rules](./04-business-rules.md#attachment-rules) — Define business rules, validation logic, and domain constraints for Attachment.
  - [65] [Tag Rules](./04-business-rules.md#tag-rules) — Define business rules, validation logic, and domain constraints for Tag.
  - [66] [ArticleTag Rules](./04-business-rules.md#articletag-rules) — Define business rules, validation logic, and domain constraints for ArticleTag.
  - [67] [AdministratorRequest Rules](./04-business-rules.md#administratorrequest-rules) — Define business rules, validation logic, and domain constraints for AdministratorRequest.
  - [68] [BanRecord Rules](./04-business-rules.md#banrecord-rules) — Define business rules, validation logic, and domain constraints for BanRecord.
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [69] [User Validation Rules](./04-business-rules.md#user-validation-rules) — Define validation rules for User, including boundary values and format requirements.
  - [70] [Profile Validation Rules](./04-business-rules.md#profile-validation-rules) — Define validation rules for Profile, including boundary values and format requirements.
  - [71] [Section Validation Rules](./04-business-rules.md#section-validation-rules) — Define validation rules for Section, including boundary values and format requirements.
  - [72] [Article Validation Rules](./04-business-rules.md#article-validation-rules) — Define validation rules for Article, including boundary values and format requirements.
  - [73] [Comment Validation Rules](./04-business-rules.md#comment-validation-rules) — Define validation rules for Comment, including boundary values and format requirements.
  - [74] [Attachment Validation Rules](./04-business-rules.md#attachment-validation-rules) — Define validation rules for Attachment, including boundary values and format requirements.
  - [75] [Tag Validation Rules](./04-business-rules.md#tag-validation-rules) — Define validation rules for Tag, including boundary values and format requirements.
  - [76] [ArticleTag Validation Rules](./04-business-rules.md#articletag-validation-rules) — Define validation rules for ArticleTag, including boundary values and format requirements.
  - [77] [AdministratorRequest Validation Rules](./04-business-rules.md#administratorrequest-validation-rules) — Define validation rules for AdministratorRequest, including boundary-value for AdministratorRequest, including boundary values and format requirements.
  - [78] [BanRecord Validation Rules](./04-business-rules.md#banrecord-validation-rules) — Define validation rules for BanRecord, including boundary values and format requirements.
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [79] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [80] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [81] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [82] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [83] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [84] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [85] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [86] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [87] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [88] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [89] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [90] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **User**: email: string, unique, passwordHash: string, createdAt: datetime, updatedAt: datetime, isBanned: boolean, banReason: string?, banAt: datetime?, createdAtAdminId: int?
- **Profile**: userId: int, unique, required, displayName: string, required, bio: string
- **Section**: id: int, primary, name: string, required, description: string, createdAt: datetime, updatedAt: datetime, createdByAdminId: int
- **Article**: id: int, primary, title: string, required, content: text, required, sectionId: int, required, authorId: int, required, createdAt: datetime, updatedAt: datetime, commentCount: int
- **Comment**: id: int, primary, content: text, required, authorId: int, required, articleId: int, required, createdAt: datetime, updatedAt: datetime
- **Attachment**: id: int, primary, articleId: int, required, fileName: string, required, fileUrl: string, required, fileType: string, uploadedAt: datetime
- **Tag**: id: int, primary, name: string, required, unique
- **ArticleTag**: articleId: int, required, tagId: int, required
- **AdministratorRequest**: id: int, primary, userId: int, required, reason: string, required, status: string, required, submittedAt: datetime, reviewedByAdminId: int?, reviewedAt: datetime?, reviewNotes: string?
- **BanRecord**: id: int, primary, userId: int, required, bannedByAdminId: int, required, reason: string, required, createdAt: datetime

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