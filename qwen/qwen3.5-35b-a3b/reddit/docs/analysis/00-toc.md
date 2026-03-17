### Table of Contents

**redditCommunity** is a backend service with the following actors and domain entities.

**Actors**: guest, member
**Entities**: User, Community, Subscription, Post, Comment, Vote, Report, Feed, Sorting

---

**Scope**

- **User** — creates posts, writes comments, subscribes to communities, owns communities, moderates communities
- **Community** — has posts, has comments, has subscribers, has moderators, has reports
- **Subscription** — links member to community, required for creating posts
- **Post** — belongs to community, belongs to author, has comments, has votes
- **Comment** — belongs to post, belongs to author, can have nested replies, has votes
- **Vote** — on post, on comment, by member
- **Report** — belongs to post, belongs to comment, viewed by moderators, can be approved or dismissed
- **Feed** — shows posts, requires user authentication (home feed)
- **Sorting** — applies to feeds, applies to comments

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
  - [2] [member Actor](./01-actors-and-auth.md#member-actor) — Define the member actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [3] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [4] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [5] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [6] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [7] [Community Concept](./02-domain-model.md#community-concept) — Describe what Community represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [8] [Subscription Concept](./02-domain-model.md#subscription-concept) — Describe what Subscription represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [Post Concept](./02-domain-model.md#post-concept) — Describe what Post represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [Comment Concept](./02-domain-model.md#comment-concept) — Describe what Comment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Vote Concept](./02-domain-model.md#vote-concept) — Describe what Vote represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Report Concept](./02-domain-model.md#report-concept) — Describe what Report represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [Feed Concept](./02-domain-model.md#feed-concept) — Describe what Feed represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [Sorting Concept](./02-domain-model.md#sorting-concept) — Describe what Sorting represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [Feed Concept](./02-domain-model.md#feed-concept-1) — Describe what Feed represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [Sorting Concept](./02-domain-model.md#sorting-concept-1) — Describe what Sorting represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [User Concept](./02-domain-model.md#user-concept-1) — Describe what User represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [18] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [19] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [20] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [21] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [22] [Unit 1: User Operations](./03-functional-requirements.md#unit-1-user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [23] [Unit 2: Community Operations](./03-functional-requirements.md#unit-2-community-operations) — Define business operations for Community: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [24] [Unit 3: Subscription Operations](./03-functional-requirements.md#unit-3-subscription-operations) — Define business operations for Subscription: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [Unit 4: Post Operations](./03-functional-requirements.md#unit-4-post-operations) — Define business operations for Post: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [Unit 5: Comment Operations](./03-functional-requirements.md#unit-5-comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [Unit 6: Vote Operations](./03-functional-requirements.md#unit-6-vote-operations) — Define business operations for Vote: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [Unit 7: Report Operations](./03-functional-requirements.md#unit-7-report-operations) — Define business operations for Report: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [Unit 8: Feed Operations](./03-functional-requirements.md#unit-8-feed-operations) — Define business operations for Feed: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [Unit 9: Sorting Operations](./03-functional-requirements.md#unit-9-sorting-operations) — Define business operations for Sorting: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [31] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [32] [Community Error Scenarios](./03-functional-requirements.md#community-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Community operations.
  - [33] [Subscription Error Scenarios](./03-functional-requirements.md#subscription-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Subscription operations.
  - [34] [Post Error Scenarios](./03-functional-requirements.md#post-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Post operations.
  - [35] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations.
  - [36] [Vote Error Scenarios](./03-functional-requirements.md#vote-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Vote operations.
  - [37] [Report Error Scenarios](./03-functional-requirements.md#report-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Report operations.
  - [38] [Feed Error Scenarios](./03-functional-requirements.md#feed-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Feed operations.
  - [39] [Sorting Error Scenarios](./03-functional-requirements.md#sorting-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Sorting operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [40] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [41] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [42] [User Rules](./04-business-rules.md#user-rules) — Define validation rules and domain constraints for User. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [43] [Community Rules](./04-business-rules.md#community-rules) — Define validation rules and domain constraints for Community. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [44] [Subscription Rules](./04-business-rules.md#subscription-rules) — Define validation rules and domain constraints for Subscription. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [45] [Post Rules](./04-business-rules.md#post-rules) — Define validation rules and domain constraints for Post. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [46] [Comment Rules](./04-business-rules.md#comment-rules) — Define validation rules and domain constraints for Comment. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [47] [Vote Rules](./04-business-rules.md#vote-rules) — Define validation rules and domain constraints for Vote. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [48] [Report Rules](./04-business-rules.md#report-rules) — Define validation rules and domain constraints for Report. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [49] [Feed Rules](./04-business-rules.md#feed-rules) — Define validation rules and domain constraints for Feed. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [50] [Sorting Rules](./04-business-rules.md#sorting-rules) — Define validation rules and domain constraints for Sorting. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [51] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [52] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [53] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [54] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [55] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [56] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **User** — creates posts, writes comments, subscribes to communities, owns communities, moderates communities
- **Community** — has posts, has comments, has subscribers, has moderators, has reports
- **Subscription** — links member to community, required for creating posts
- **Post** — belongs to community, belongs to author, has comments, has votes
- **Comment** — belongs to post, belongs to author, can have nested replies, has votes
- **Vote** — on post, on comment, by member
- **Report** — belongs to post, belongs to comment, viewed by moderators, can be approved or dismissed
- **Feed** — shows posts, requires user authentication (home feed)
- **Sorting** — applies to feeds, applies to comments

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