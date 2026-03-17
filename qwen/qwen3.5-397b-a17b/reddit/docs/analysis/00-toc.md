### Table of Contents

**redditClone** is a backend service with the following actors and domain entities.

**Actors**: guest, member
**Entities**: User, Karma, Community, Subscription, Post, Vote, Comment, Moderator, Ban, Report

---

**Scope**

- **User** — has one Karma, has many Posts as author, has many Comments as author, has many Subscriptions, has many Votes, is moderator in many Communities via Moderator, is banned in many Communities via Ban, issues many Bans via Ban
- **Karma** — belongs to User
- **Community** — owned by User, has many Subscribers via Subscription, has many Posts, has many Moderators via Moderator, has many Bans, has many Reports
- **Subscription** — belongs to User, belongs to Community
- **Post** — belongs to User as author, belongs to Community, has many Comments, has many Votes, has many Reports
- **Vote** — belongs to User, targets either Post or Comment (polymorphic)
- **Comment** — belongs to User as author, belongs to Post, belongs to Comment as parent (for replies, optional), has many Comments as replies, has many Votes, has many Reports
- **Moderator** — belongs to User, belongs to Community
- **Ban** — belongs to User (banned user), belongs to Community, belongs to User (issued by)
- **Report** — belongs to User (reporter), belongs to Community, targets either Post or Comment (polymorphic)

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
| [04-business-rules.md](./04-business-rules.md) | Business rules, validation constraints, data browsing expectations, error scenarios | service-layer |
| [05-non-functional.md](./05-non-functional.md) | Data ownership, privacy, retention, and recovery policies | test-infra |

**Section Navigation**

<!-- Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })` -->

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [guest Actor](./01-actors-and-auth.md#guest-actor) — Define the guest actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [2] [member Actor](./01-actors-and-auth.md#member-actor) — Define the member actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [3] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [4] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [5] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [6] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [7] [Karma Concept](./02-domain-model.md#karma-concept) — Describe what Karma represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [8] [Community Concept](./02-domain-model.md#community-concept) — Describe what Community represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [Subscription Concept](./02-domain-model.md#subscription-concept) — Describe what Subscription represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [Post Concept](./02-domain-model.md#post-concept) — Describe what Post represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Vote Concept](./02-domain-model.md#vote-concept) — Describe what Vote represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Comment Concept](./02-domain-model.md#comment-concept) — Describe what Comment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [Moderator Concept](./02-domain-model.md#moderator-concept) — Describe what Moderator represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [Ban Concept](./02-domain-model.md#ban-concept) — Describe what Ban represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [Report Concept](./02-domain-model.md#report-concept) — Describe what Report represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [16] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [17] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [18] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [19] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [20] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [21] [Karma Operations](./03-functional-requirements.md#karma-operations) — Define business operations for Karma: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [22] [Community Operations](./03-functional-requirements.md#community-operations) — Define business operations for Community: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [23] [Subscription Operations](./03-functional-requirements.md#subscription-operations) — Define business operations for Subscription: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [24] [Post Operations](./03-functional-requirements.md#post-operations) — Define business operations for Post: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [Vote Operations](./03-functional-requirements.md#vote-operations) — Define business operations for Vote: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [Moderator Operations](./03-functional-requirements.md#moderator-operations) — Define business operations for Moderator: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [Ban Operations](./03-functional-requirements.md#ban-operations) — Define business operations for Ban: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [Report Operations](./03-functional-requirements.md#report-operations) — Define business operations for Report: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [30] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [31] [Karma Error Scenarios](./03-functional-requirements.md#karma-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Karma operations.
  - [32] [Community Error Scenarios](./03-functional-requirements.md#community-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Community operations.
  - [33] [Subscription Error Scenarios](./03-functional-requirements.md#subscription-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Subscription operations.
  - [34] [Post Error Scenarios](./03-functional-requirements.md#post-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Post operations.
  - [35] [Vote Error Scenarios](./03-functional-requirements.md#vote-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Vote operations.
  - [36] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations.
  - [37] [Moderator Error Scenarios](./03-functional-requirements.md#moderator-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Moderator operations.
  - [38] [Ban Error Scenarios](./03-functional-requirements.md#ban-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Ban operations.
  - [39] [Report Error Scenarios](./03-functional-requirements.md#report-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Report operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [40] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [41] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [42] [User Rules](./04-business-rules.md#user-rules) — Define validation rules and domain constraints for User. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [43] [Karma Rules](./04-business-rules.md#karma-rules) — Define validation rules and domain constraints for Karma. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [44] [Community Rules](./04-business-rules.md#community-rules) — Define validation rules and domain constraints for Community. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [45] [Subscription Rules](./04-business-rules.md#subscription-rules) — Define validation rules and domain constraints for Subscription. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [46] [Post Rules](./04-business-rules.md#post-rules) — Define validation rules and domain constraints for Post. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [47] [Vote Rules](./04-business-rules.md#vote-rules) — Define validation rules and domain constraints for Vote. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [48] [Comment Rules](./04-business-rules.md#comment-rules) — Define validation rules and domain constraints for Comment. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [49] [Moderator Rules](./04-business-rules.md#moderator-rules) — Define validation rules and domain constraints for Moderator. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [50] [Ban Rules](./04-business-rules.md#ban-rules) — Define validation rules and domain constraints for Ban. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [51] [Report Rules](./04-business-rules.md#report-rules) — Define validation rules and domain constraints for Report. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [52] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [53] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [54] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [55] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [56] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [57] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

---

**Canonical Sources**

Each type of information has one authoritative location. Other files should reference these canonical sources.

| Information Type | Canonical File |
|------------------|---------------|
| Domain concepts | [02-domain-model.md](./02-domain-model.md) |
| Error conditions | [04-business-rules.md](./04-business-rules.md) |
| Permissions | [01-actors-and-auth.md](./01-actors-and-auth.md) |
| Actor definitions | [01-actors-and-auth.md](./01-actors-and-auth.md) |
| Filtering/pagination rules | [04-business-rules.md](./04-business-rules.md) |
| Data retention/recovery | [05-non-functional.md](./05-non-functional.md) |

---

**Glossary**

- **User** — has one Karma, has many Posts as author, has many Comments as author, has many Subscriptions, has many Votes, is moderator in many Communities via Moderator, is banned in many Communities via Ban, issues many Bans via Ban
- **Karma** — belongs to User
- **Community** — owned by User, has many Subscribers via Subscription, has many Posts, has many Moderators via Moderator, has many Bans, has many Reports
- **Subscription** — belongs to User, belongs to Community
- **Post** — belongs to User as author, belongs to Community, has many Comments, has many Votes, has many Reports
- **Vote** — belongs to User, targets either Post or Comment (polymorphic)
- **Comment** — belongs to User as author, belongs to Post, belongs to Comment as parent (for replies, optional), has many Comments as replies, has many Votes, has many Reports
- **Moderator** — belongs to User, belongs to Community
- **Ban** — belongs to User (banned user), belongs to Community, belongs to User (issued by)
- **Report** — belongs to User (reporter), belongs to Community, targets either Post or Comment (polymorphic)

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
- File scope: Business rules, validation constraints, data browsing expectations, error scenarios
- Downstream phase: service-layer
- File scope: Data ownership, privacy, retention, and recovery policies
- Downstream phase: test-infra

**Active Features**

- file-storage