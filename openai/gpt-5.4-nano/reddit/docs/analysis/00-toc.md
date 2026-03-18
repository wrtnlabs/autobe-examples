### Table of Contents

**communityPlatform** is a backend service with the following actors and domain entities.

**Actors**: guest, member, admin
**Entities**: User, UserProfile, Community, CommunitySubscription, Post, PostVote, Comment, CommentVote, Report, CommunityBan

---

**Scope**

- **User** — hasProfile, createsPosts, writesComments, ownsCommunities, subscribesToCommunities, receivesKarmaFromVotes
- **UserProfile** — belongsTo User, listedOn UserProfilePages
- **Community** — hasOwner User, hasModerators User, hasSubscriptions, hasPosts, hasReports, canBanUsers
- **CommunitySubscription** — belongsTo User, belongsTo Community
- **Post** — belongsTo Community, belongsTo Author User, hasVotes, hasComments, editedBy Author User, deletedBy Author User or Moderator
- **PostVote** — belongsTo Post, belongsTo Voter User
- **Comment** — belongsTo Post, belongsTo Author User, hasParentComment optional, hasReplies, hasVotes, editedBy Author User, deletedBy Author User or Moderator
- **CommentVote** — belongsTo Comment, belongsTo Voter User
- **Report** — belongsTo Reporter User, targets Post or Comment, belongsTo Community, reviewedBy Moderator User
- **CommunityBan** — belongsTo Community, belongsTo Banned User, appliedBy Moderator User

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
| [04-business-rules.md](./04-business-rules.md) | Business rules, validation constraints, data browsing expectations, error scenarios | service-layer |
| [05-non-functional.md](./05-non-functional.md) | Data ownership, privacy, retention, and recovery policies | test-infra |

**Section Navigation**

<!-- Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })` -->

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [guest Actor](./01-actors-and-auth.md#guest-actor) — Define the guest actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [2] [member Actor](./01-actors-and-auth.md#member-actor) — Define the member actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [3] [admin Actor](./01-actors-and-auth.md#admin-actor) — Define the admin actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [4] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [5] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [6] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [7] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [8] [UserProfile Concept](./02-domain-model.md#userprofile-concept) — Describe what UserProfile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [Community Concept](./02-domain-model.md#community-concept) — Describe what Community represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [CommunitySubscription Concept](./02-domain-model.md#communitysubscription-concept) — Describe what CommunitySubscription represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Post Concept](./02-domain-model.md#post-concept) — Describe what Post represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [PostVote Concept](./02-domain-model.md#postvote-concept) — Describe what PostVote represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [Comment Concept](./02-domain-model.md#comment-concept) — Describe what Comment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [CommentVote Concept](./02-domain-model.md#commentvote-concept) — Describe what CommentVote represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [Report Concept](./02-domain-model.md#report-concept) — Describe what Report represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [CommunityBan Concept](./02-domain-model.md#communityban-concept) — Describe what CommunityBan represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [17] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [18] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [19] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [20] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [21] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [22] [UserProfile Operations](./03-functional-requirements.md#userprofile-operations) — Define business operations for UserProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [23] [Community Operations](./03-functional-requirements.md#community-operations) — Define business operations for Community: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [24] [CommunitySubscription Operations](./03-functional-requirements.md#communitysubscription-operations) — Define business operations for CommunitySubscription: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [Post Operations](./03-functional-requirements.md#post-operations) — Define business operations for Post: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [PostVote Operations](./03-functional-requirements.md#postvote-operations) — Define business operations for PostVote: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [CommentVote Operations](./03-functional-requirements.md#commentvote-operations) — Define business operations for CommentVote: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [Report Operations](./03-functional-requirements.md#report-operations) — Define business operations for Report: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [CommunityBan Operations](./03-functional-requirements.md#communityban-operations) — Define business operations for CommunityBan: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [31] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [32] [UserProfile Error Scenarios](./03-functional-requirements.md#userprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all UserProfile operations.
  - [33] [Community Error Scenarios](./03-functional-requirements.md#community-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Community operations.
  - [34] [CommunitySubscription Error Scenarios](./03-functional-requirements.md#communitysubscription-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CommunitySubscription operations.
  - [35] [Post Error Scenarios](./03-functional-requirements.md#post-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Post operations.
  - [36] [PostVote Error Scenarios](./03-functional-requirements.md#postvote-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all PostVote operations.
  - [37] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations.
  - [38] [CommentVote Error Scenarios](./03-functional-requirements.md#commentvote-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CommentVote operations.
  - [39] [Report Error Scenarios](./03-functional-requirements.md#report-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Report operations.
  - [40] [CommunityBan Error Scenarios](./03-functional-requirements.md#communityban-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CommunityBan operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [41] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [42] [User Rules](./04-business-rules.md#user-rules) — Define validation rules and domain constraints for User. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [43] [UserProfile Rules](./04-business-rules.md#userprofile-rules) — Define validation rules and domain constraints for UserProfile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [44] [Community Rules](./04-business-rules.md#community-rules) — Define validation rules and domain constraints for Community. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [45] [CommunitySubscription Rules](./04-business-rules.md#communitysubscription-rules) — Define validation rules and domain constraints for CommunitySubscription. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [46] [Post Rules](./04-business-rules.md#post-rules) — Define validation rules and domain constraints for Post. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [47] [PostVote Rules](./04-business-rules.md#postvote-rules) — Define validation rules and domain constraints for PostVote. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [48] [Comment Rules](./04-business-rules.md#comment-rules) — Define validation rules and domain constraints for Comment. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [49] [CommentVote Rules](./04-business-rules.md#commentvote-rules) — Define validation rules and domain constraints for CommentVote. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [50] [Report Rules](./04-business-rules.md#report-rules) — Define validation rules and domain constraints for Report. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [51] [CommunityBan Rules](./04-business-rules.md#communityban-rules) — Define validation rules and domain constraints for CommunityBan. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [52] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [53] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [54] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [55] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.

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

- **User** — hasProfile, createsPosts, writesComments, ownsCommunities, subscribesToCommunities, receivesKarmaFromVotes
- **UserProfile** — belongsTo User, listedOn UserProfilePages
- **Community** — hasOwner User, hasModerators User, hasSubscriptions, hasPosts, hasReports, canBanUsers
- **CommunitySubscription** — belongsTo User, belongsTo Community
- **Post** — belongsTo Community, belongsTo Author User, hasVotes, hasComments, editedBy Author User, deletedBy Author User or Moderator
- **PostVote** — belongsTo Post, belongsTo Voter User
- **Comment** — belongsTo Post, belongsTo Author User, hasParentComment optional, hasReplies, hasVotes, editedBy Author User, deletedBy Author User or Moderator
- **CommentVote** — belongsTo Comment, belongsTo Voter User
- **Report** — belongsTo Reporter User, targets Post or Comment, belongsTo Community, reviewedBy Moderator User
- **CommunityBan** — belongsTo Community, belongsTo Banned User, appliedBy Moderator User

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