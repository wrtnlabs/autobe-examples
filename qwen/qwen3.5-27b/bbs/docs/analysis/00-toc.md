### Table of Contents

**discussionBoard** is a backend service with the following actors and domain entities.

**Actors**: guest, member, administrator
**Entities**: User, Section, Article, Comment, AdminRequest, BanRecord, Attachment, Tag

---

**Scope**

- **User**: email: unique, required, password: required, displayName: text, bio: text, role: enum(regular, super) for administrators, banned: boolean, banReason: text, createdAt: datetime, updatedAt: datetime | Relationships: owns Article, owns Comment, owns AdminRequest, owns BanRecord, owns Attachment
- **Section**: name: text, required, description: text, createdAt: datetime, updatedAt: datetime | Relationships: contains Article, managed by administrator
- **Article**: title: text, required, content: text, required, createdAt: datetime, updatedAt: datetime | Relationships: owned by User, belongs to Section, has Comment, has Attachment, has Tag
- **Comment**: content: text, required, createdAt: datetime, updatedAt: datetime | Relationships: owned by User, belongs to Article
- **AdminRequest**: reason: text, required, status: enum(pending, approved, rejected), submittedAt: datetime, reviewedAt: datetime | Relationships: submitted by User, reviewed by superAdministrator
- **BanRecord**: reason: text, required, bannedAt: datetime, bannedBy: reference to User | Relationships: applies to User, created by administrator
- **Attachment**: fileName: text, fileType: text, fileSize: number, url: text, uploadedAt: datetime | Relationships: attached to Article, uploaded by User
- **Tag**: name: text, required | Relationships: applied to Article

- **guest** (guest)
- **member** (member)
- **administrator** (admin)

---

**Document Map**

| File | Role | Downstream |
|------|------|------------|
| [00-toc.md](./00-toc.md) | Project summary, scope, glossary, and assumptions | project-setup |
| [01-actors-and-auth.md](./01-actors-and-auth.md) | Actor definitions, permission matrix, authentication, session, account lifecycle | auth-middleware |
| [02-domain-model.md](./02-domain-model.md) | Business concepts, relationships, and states from user perspective | database-design |
| [03-functional-requirements.md](./03-functional-requirements.md) | What operations users can perform, use cases, business workflows | interface-design |
| [04-business-rules.md](./04-business-rules.md) | Data isolation, business rules, data browsing expectations, error scenarios | service-layer |
| [05-non-functional.md](./05-non-functional.md) | Performance SLOs, security policies, data integrity, storage requirements | test-infra |

**Section Navigation**

<!-- Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })` -->

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [guest Actor](./01-actors-and-auth.md#guest-actor) — Define the guest actor's role and capabilities in business terms.
  - [2] [member Actor](./01-actors-and-auth.md#member-actor) — Define the member actor's role and capabilities in business terms.
  - [3] [administrator Actor](./01-actors-and-auth.md#administrator-actor) — Define the administrator actor's role and capabilities in business terms.
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
  - [11] [AdminRequest Concept](./02-domain-model.md#adminrequest-concept) — Describe what AdminRequest represents in the business domain, its purpose, and how users interact with it.
  - [12] [BanRecord Concept](./02-domain-model.md#banrecord-concept) — Describe what BanRecord represents in the business domain, its purpose, and how users interact with it.
  - [13] [Attachment Concept](./02-domain-model.md#attachment-concept) — Describe what Attachment represents in the business domain, its purpose, and how users interact with it.
  - [14] [Tag Concept](./02-domain-model.md#tag-concept) — Describe what Tag represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [15] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [16] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [17] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [18] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [19] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [20] [Section Operations](./03-functional-requirements.md#section-operations) — Define business operations for Section: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [21] [Article Operations](./03-functional-requirements.md#article-operations) — Define business operations for Article: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [22] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [23] [AdminRequest Operations](./03-functional-requirements.md#adminrequest-operations) — Define business operations for AdminRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [24] [BanRecord Operations](./03-functional-requirements.md#banrecord-operations) — Define business operations for BanRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [Attachment Operations](./03-functional-requirements.md#attachment-operations) — Define business operations for Attachment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [Tag Operations](./03-functional-requirements.md#tag-operations) — Define business operations for Tag: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [27] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective.
  - [28] [Section Actions](./03-functional-requirements.md#section-actions) — Define business actions and workflows for the Section domain group from a functional requirements perspective.
  - [29] [Article Actions](./03-functional-requirements.md#article-actions) — Define business actions and workflows for the Article domain group from a functional requirements perspective.
  - [30] [Comment Actions](./03-functional-requirements.md#comment-actions) — Define business actions and workflows for the Comment domain group from a functional requirements perspective.
  - [31] [AdminRequest Actions](./03-functional-requirements.md#adminrequest-actions) — Define business actions and workflows for the AdminRequest domain group from a functional requirements perspective.
  - [32] [BanRecord Actions](./03-functional-requirements.md#banrecord-actions) — Define business actions and workflows for the BanRecord domain group from a functional requirements perspective.
  - [33] [Attachment Actions](./03-functional-requirements.md#attachment-actions) — Define business actions and workflows for the Attachment domain group from a functional requirements perspective.
  - [34] [Tag Actions](./03-functional-requirements.md#tag-actions) — Define business actions and workflows for the Tag domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [35] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [36] [Section Error Scenarios](./03-functional-requirements.md#section-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Section operations.
  - [37] [Article Error Scenarios](./03-functional-requirements.md#article-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Article operations.
  - [38] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations.
  - [39] [AdminRequest Error Scenarios](./03-functional-requirements.md#adminrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdminRequest operations.
  - [40] [BanRecord Error Scenarios](./03-functional-requirements.md#banrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all BanRecord operations.
  - [41] [Attachment Error Scenarios](./03-functional-requirements.md#attachment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Attachment operations.
  - [42] [Tag Error Scenarios](./03-functional-requirements.md#tag-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Tag operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [43] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective.
  - [44] [Section User Scenarios](./03-functional-requirements.md#section-user-scenarios) — Define end-to-end user scenarios involving Section and related concepts, describing business flows from the user's perspective.
  - [45] [Article User Scenarios](./03-functional-requirements.md#article-user-scenarios) — Define end-to-end user scenarios involving Article and related concepts, describing business flows from the user's perspective.
  - [46] [Comment User Scenarios](./03-functional-requirements.md#comment-user-scenarios) — Define end-to-end user scenarios involving Comment and related concepts, describing business flows from the user's perspective.
  - [47] [AdminRequest User Scenarios](./03-functional-requirements.md#adminrequest-user-scenarios) — Define end-to-end user scenarios involving AdminRequest and related concepts, describing business flows from the user's perspective.
  - [48] [BanRecord User Scenarios](./03-functional-requirements.md#banrecord-user-scenarios) — Define end-to-end user scenarios involving BanRecord and related concepts, describing business flows from the user's perspective.
  - [49] [Attachment User Scenarios](./03-functional-requirements.md#attachment-user-scenarios) — Define end-to-end user scenarios involving Attachment and related concepts, describing business flows from the user's perspective.
  - [50] [Tag User Scenarios](./03-functional-requirements.md#tag-user-scenarios) — Define end-to-end user scenarios involving Tag and related concepts, describing business flows from the user's perspective.
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
  - [57] [AdminRequest Rules](./04-business-rules.md#adminrequest-rules) — Define business rules, validation logic, and domain constraints for AdminRequest.
  - [58] [BanRecord Rules](./04-business-rules.md#banrecord-rules) — Define business rules, validation logic, and domain constraints for BanRecord.
  - [59] [Attachment Rules](./04-business-rules.md#attachment-rules) — Define business rules, validation logic, and domain constraints for Attachment.
  - [60] [Tag Rules](./04-business-rules.md#tag-rules) — Define business rules, validation logic, and domain constraints for Tag.
- [Business Validation Criteria](./04-business-rules.md#business-validation-criteria)
  - [61] [User Validation Criteria](./04-business-rules.md#user-validation-criteria) — Define business validation expectations for User, including acceptable data quality criteria.
  - [62] [Section Validation Criteria](./04-business-rules.md#section-validation-criteria) — Define business validation expectations for Section, including acceptable data quality criteria.
  - [63] [Article Validation Criteria](./04-business-rules.md#article-validation-criteria) — Define business validation expectations for Article, including acceptable data quality criteria.
  - [64] [Comment Validation Criteria](./04-business-rules.md#comment-validation-criteria) — Define business validation expectations for Comment, including acceptable data quality criteria.
  - [65] [AdminRequest Validation Criteria](./04-business-rules.md#adminrequest-validation-criteria) — Define business validation expectations for AdminRequest, including acceptable data quality criteria.
  - [66] [BanRecord Validation Criteria](./04-business-rules.md#banrecord-validation-criteria) — Define business validation expectations for BanRecord, including acceptable data quality criteria.
  - [67] [Attachment Validation Criteria](./04-business-rules.md#attachment-validation-criteria) — Define business validation expectations for Attachment, including acceptable data quality criteria.
  - [68] [Tag Validation Criteria](./04-business-rules.md#tag-validation-criteria) — Define business validation expectations for Tag, including acceptable data quality criteria.
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [69] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
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

- **User**: email: unique, required, password: required, displayName: text, bio: text, role: enum(regular, super) for administrators, banned: boolean, banReason: text, createdAt: datetime, updatedAt: datetime
- **Section**: name: text, required, description: text, createdAt: datetime, updatedAt: datetime
- **Article**: title: text, required, content: text, required, createdAt: datetime, updatedAt: datetime
- **Comment**: content: text, required, createdAt: datetime, updatedAt: datetime
- **AdminRequest**: reason: text, required, status: enum(pending, approved, rejected), submittedAt: datetime, reviewedAt: datetime
- **BanRecord**: reason: text, required, bannedAt: datetime, bannedBy: reference to User
- **Attachment**: fileName: text, fileType: text, fileSize: number, url: text, uploadedAt: datetime
- **Tag**: name: text, required

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
- File scope: Data isolation, business rules, data browsing expectations, error scenarios
- Downstream phase: service-layer
- File scope: Performance SLOs, security policies, data integrity, storage requirements
- Downstream phase: test-infra

**Active Features**

- file-storage