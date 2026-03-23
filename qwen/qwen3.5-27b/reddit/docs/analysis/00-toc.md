### Table of Contents

**redditClone** is a backend service with the following actors and domain entities.

**Actors**: guest, member, admin
**Entities**: User, Community, Post, Comment, Vote, Subscription, Report, Moderator, Ban, Block

---

**Scope**

- **User**: username: text(3-20), unique, displayName: text(3-50), bio: text(0-500), avatar: image, karma: integer, email: text, unique, passwordHash: text, createdAt: datetime, updatedAt: datetime | Relationships: owns Community (as owner), writes Post, writes Comment, subscribes to Community, receives Report (as reporter), moderates Community
- **Community**: name: text(3-50), unique, description: text(0-500), icon: image, subscriberCount: integer, createdAt: datetime | Relationships: owned by User (owner), contains Post, has Member (subscriber), has Member (moderator)
- **Post**: title: text(1-500), content: text(1-10000), type: enum[text, link, image, score: integer, createdAt: datetime | Relationships: created by User (author), belongs to Community, has Comment, has Vote, has Report
- **Comment**: content: text(1-1000), score: integer, createdAt: datetime | Relationships: written by User (author), belongs to Post, replies to Comment (parent), has Vote, has Report
- **Vote**: voterId: reference to User, targetId: reference to Post or Comment, value: integer(1, -1), createdAt: datetime | Relationships: from User (voter), on Post, on Comment
- **Subscription**: userId: reference to User, communityId: reference to Community, subscribedAt: datetime | Relationships: from User, to Community
- **Report**: reason: text(1-500), status: enum[pending, approved, dismissed], createdAt: datetime | Relationships: from User (reporter), about Post, about Comment
- **Moderator**: role: enum[owner, mod] | Relationships: User moderating Community
- **Ban**: reason: text(0-500), bannedAt: datetime, liftedAt: datetime, nullable | Relationships: User banned from Community
- **Block**: blockedAt: datetime | Relationships: User blocked from Community

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
| [04-business-rules.md](./04-business-rules.md) | Data isolation, business rules, data browsing expectations, error scenarios | service-layer |
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
  - [8] [Community Concept](./02-domain-model.md#community-concept) — Describe what Community represents in the business domain, its purpose, and how users interact with it.
  - [9] [Post Concept](./02-domain-model.md#post-concept) — Describe what Post represents in the business domain, its purpose, and how users interact with it.
  - [10] [Comment Concept](./02-domain-model.md#comment-concept) — Describe what Comment represents in the business domain, its purpose, and how users interact with it.
  - [11] [Vote Concept](./02-domain-model.md#vote-concept) — Describe what Vote represents in the business domain, its purpose, and how users interact with it.
  - [12] [Subscription Concept](./02-domain-model.md#subscription-concept) — Describe what Subscription represents in the business domain, its purpose, and how users interact with it.
  - [13] [Report Concept](./02-domain-model.md#report-concept) — Describe what Report represents in the business domain, its purpose, and how users interact with it.
  - [14] [Moderator Concept](./02-domain-model.md#moderator-concept) — Describe what Moderator represents in the business domain, its purpose, and how users interact with it.
  - [15] [Ban Concept](./02-domain-model.md#ban-concept) — Describe what Ban represents in the business domain, its purpose, and how users interact with it.
  - [16] [Block Concept](./02-domain-model.md#block-concept) — Describe what Block represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [17] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [18] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [19] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [20] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [21] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [22] [Community Operations](./03-functional-requirements.md#community-operations) — Define business operations for Community: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [23] [Post Operations](./03-functional-requirements.md#post-operations) — Define business operations for Post: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [24] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [Vote Operations](./03-functional-requirements.md#vote-operations) — Define business operations for Vote: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [Subscription Operations](./03-functional-requirements.md#subscription-operations) — Define business operations for Subscription: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [Report Operations](./03-functional-requirements.md#report-operations) — Define business operations for Report: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [Moderator Operations](./03-functional-requirements.md#moderator-operations) — Define business operations for Moderator: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [Ban Operations](./03-functional-requirements.md#ban-operations) — Define business operations for Ban: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [Block Operations](./03-functional-requirements.md#block-operations) — Define business operations for Block: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [31] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective.
  - [32] [Community Actions](./03-functional-requirements.md#community-actions) — Define business actions and workflows for the Community domain group from a functional requirements perspective.
  - [33] [Post Actions](./03-functional-requirements.md#post-actions) — Define business actions and workflows for the Post domain group from a functional requirements perspective.
  - [34] [Comment Actions](./03-functional-requirements.md#comment-actions) — Define business actions and workflows for the Comment domain group from a functional requirements perspective.
  - [35] [Vote Actions](./03-functional-requirements.md#vote-actions) — Define business actions and workflows for the Vote domain group from a functional requirements perspective.
  - [36] [Subscription Actions](./03-functional-requirements.md#subscription-actions) — Define business actions and workflows for the Subscription domain group from a functional requirements perspective.
  - [37] [Report Actions](./03-functional-requirements.md#report-actions) — Define business actions and workflows for the Report domain group from a functional requirements perspective.
  - [38] [Moderator Actions](./03-functional-requirements.md#moderator-actions) — Define business actions and workflows for the Moderator domain group from a functional requirements perspective.
  - [39] [Ban Actions](./03-functional-requirements.md#ban-actions) — Define business actions and workflows for the Ban domain group from a functional requirements perspective.
  - [40] [Block Actions](./03-functional-requirements.md#block-actions) — Define business actions and workflows for the Block domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [41] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [42] [Community Error Scenarios](./03-functional-requirements.md#community-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Community operations.
  - [43] [Post Error Scenarios](./03-functional-requirements.md#post-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Post operations.
  - [44] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations.
  - [45] [Vote Error Scenarios](./03-functional-requirements.md#vote-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Vote operations.
  - [46] [Subscription Error Scenarios](./03-functional-requirements.md#subscription-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Subscription operations.
  - [47] [Report Error Scenarios](./03-functional-requirements.md#report-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Report operations.
  - [48] [Moderator Error Scenarios](./03-functional-requirements.md#moderator-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Moderator operations.
  - [49] [Ban Error Scenarios](./03-functional-requirements.md#ban-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Ban operations.
  - [50] [Block Error Scenarios](./03-functional-requirements.md#block-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Block operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [51] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective.
  - [52] [Community User Scenarios](./03-functional-requirements.md#community-user-scenarios) — Define end-to-end user scenarios involving Community and related concepts, describing business flows from the user's perspective.
  - [53] [Post User Scenarios](./03-functional-requirements.md#post-user-scenarios) — Define end-to-end user scenarios involving Post and related concepts, describing business flows from the user's perspective.
  - [54] [Comment User Scenarios](./03-functional-requirements.md#comment-user-scenarios) — Define end-to-end user scenarios involving Comment and related concepts, describing business flows from the user's perspective.
  - [55] [Vote User Scenarios](./03-functional-requirements.md#vote-user-scenarios) — Define end-to-end user scenarios involving Vote and related concepts, describing business flows from the user's perspective.
  - [56] [Subscription User Scenarios](./03-functional-requirements.md#subscription-user-scenarios) — Define end-to-end user scenarios involving Subscription and related concepts, describing business flows from the user's perspective.
  - [57] [Report User Scenarios](./03-functional-requirements.md#report-user-scenarios) — Define end-to-end user scenarios involving Report and related concepts, describing business flows from the user's perspective.
  - [58] [Moderator User Scenarios](./03-functional-requirements.md#moderator-user-scenarios) — Define end-to-end user scenarios involving Moderator and related concepts, describing business flows from the user's perspective.
  - [59] [Ban User Scenarios](./03-functional-requirements.md#ban-user-scenarios) — Define end-to-end user scenarios involving Ban and related concepts, describing business flows from the user's perspective.
  - [60] [Block User Scenarios](./03-functional-requirements.md#block-user-scenarios) — Define end-to-end user scenarios involving Block and related concepts, describing business flows from the user's perspective.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [61] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [62] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [63] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User.
  - [64] [Community Rules](./04-business-rules.md#community-rules) — Define business rules, validation logic, and domain constraints for Community.
  - [65] [Post Rules](./04-business-rules.md#post-rules) — Define business rules, validation logic, and domain constraints for Post.
  - [66] [Comment Rules](./04-business-rules.md#comment-rules) — Define business rules, validation logic, and domain constraints for Comment.
  - [67] [Vote Rules](./04-business-rules.md#vote-rules) — Define business rules, validation logic, and domain constraints for Vote.
  - [68] [Subscription Rules](./04-business-rules.md#subscription-rules) — Define business rules, validation logic, and domain constraints for Subscription.
  - [69] [Report Rules](./04-business-rules.md#report-rules) — Define business rules, validation logic, and domain constraints for Report.
  - [70] [Moderator Rules](./04-business-rules.md#moderator-rules) — Define business rules, validation logic, and domain constraints for Moderator.
  - [71] [Ban Rules](./04-business-rules.md#ban-rules) — Define business rules, validation logic, and domain constraints for Ban.
  - [72] [Block Rules](./04-business-rules.md#block-rules) — Define business rules, validation logic, and domain constraints for Block.
- [Business Validation Criteria](./04-business-rules.md#business-validation-criteria)
  - [73] [User Validation Criteria](./04-business-rules.md#user-validation-criteria) — Define business validation expectations for User, including acceptable data quality criteria.
  - [74] [Community Validation Criteria](./04-business-rules.md#community-validation-criteria) — Define business validation expectations for Community, including acceptable data quality criteria.
  - [75] [Post Validation Criteria](./04-business-rules.md#post-validation-criteria) — Define business validation expectations for Post, including acceptable data quality criteria.
  - [76] [Comment Validation Criteria](./04-business-rules.md#comment-validation-criteria) — Define business validation expectations for Comment, including acceptable data quality criteria.
  - [77] [Vote Validation Criteria](./04-business-rules.md#vote-validation-criteria) — Define business validation expectations for Vote, including acceptable data quality criteria.
  - [78] [Subscription Validation Criteria](./04-business-rules.md#subscription-validation-criteria) — Define business validation expectations for Subscription, including acceptable data quality criteria.
  - [79] [Report Validation Criteria](./04-business-rules.md#report-validation-criteria) — Define business validation expectations for Report, including acceptable data quality criteria.
  - [80] [Moderator Validation Criteria](./04-business-rules.md#moderator-validation-criteria) — Define business validation expectations for Moderator, including acceptable data quality criteria.
  - [81] [Ban Validation Criteria](./04-business-rules.md#ban-validation-criteria) — Define business validation expectations for Ban, including acceptable data quality criteria.
  - [82] [Block Validation Criteria](./04-business-rules.md#block-validation-criteria) — Define business validation expectations for Block, including acceptable data quality criteria.
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [83] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [84] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [85] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [86] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [87] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [88] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [89] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [90] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [91] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [92] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [93] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [94] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **User**: username: text(3-20), unique, displayName: text(3-50), bio: text(0-500), avatar: image, karma: integer, email: text, unique, passwordHash: text, createdAt: datetime, updatedAt: datetime
- **Community**: name: text(3-50), unique, description: text(0-500), icon: image, subscriberCount: integer, createdAt: datetime
- **Post**: title: text(1-500), content: text(1-10000), type: enum[text, link, image, score: integer, createdAt: datetime
- **Comment**: content: text(1-1000), score: integer, createdAt: datetime
- **Vote**: voterId: reference to User, targetId: reference to Post or Comment, value: integer(1, -1), createdAt: datetime
- **Subscription**: userId: reference to User, communityId: reference to Community, subscribedAt: datetime
- **Report**: reason: text(1-500), status: enum[pending, approved, dismissed], createdAt: datetime
- **Moderator**: role: enum[owner, mod]
- **Ban**: reason: text(0-500), bannedAt: datetime, liftedAt: datetime, nullable
- **Block**: blockedAt: datetime

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