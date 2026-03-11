### Table of Contents

**redditCommunity** is a backend service with the following actors and domain entities.

**Actors**: guest, member, admin
**Entities**: User, Profile, Community, Post, Comment, Vote, Subscription, Report, Ban

---

**Scope**

- **User**: email: string, unique, username: string, unique, password: hashed, karma: integer, can be negative | Relationships: has one Profile, creates many Posts, creates many Comments, casts many Votes, subscribes to many Communities via Subscription, creates many Reports, can be Banned from Communities
- **Profile**: displayName: string, bio: text, avatarUrl: string | Relationships: belongs to one User
- **Community**: name: string, unique, description: text, iconUrl: string, subscriberCount: integer | Relationships: owned by one User, has many Posts, has many Subscriptions, has many Bans, has many Reports
- **Post**: title: string, required, type: enum(text|link|image), content: text or url or imageUrl, voteScore: integer, commentCount: integer, createdAt: datetime | Relationships: belongs to one User (author), belongs to one Community, has many Comments, has many Votes, can be reported via Reports
- **Comment**: content: text, voteScore: integer, createdAt: datetime | Relationships: belongs to one User (author), belongs to one Post, has parent Comment (for replies), has many Votes, can be reported via Reports
- **Vote**: direction: enum(up|down), createdAt: datetime | Relationships: cast by one User, targets one Post or one Comment
- **Subscription**: createdAt: datetime | Relationships: subscribed by one User, to one Community
- **Report**: reason: text, status: enum(pending|approved|dismissed), createdAt: datetime | Relationships: filed by one User, targets one Post or one Comment, belongs to one Community, reviewed by Moderators
- **Ban**: reason: text, optional, createdAt: datetime | Relationships: issued by one User (moderator), against one User, in one Community

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

> Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })`

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [guest Actor](./01-actors-and-auth.md#guest-actor) — Define the guest actor's role and capabilities in business terms. {guest browsing, popular feed access, community feed viewing, read-only access, public profile viewing, content visibility, login required actions, vote restrictions, post creation blocked, comment restrictions, subscription unavailable, report functionality locked, home feed unavailable, community search, karma score viewing, subscriber count viewing}
  - [2] [member Actor](./01-actors-and-auth.md#member-actor) — Define the member actor's role and capabilities in business terms. {authenticated user, community creation, community ownership, subscription management, post creation, post editing, post deletion, comment creation, comment editing, comment deletion, voting system, vote modification, content reporting, home feed access, profile editing, password change, account deletion, moderator roles, ban management, report management, nested replies, post types}
  - [3] [admin Actor](./01-actors-and-auth.md#admin-actor) — Define the admin actor's role and capabilities in business terms. {platform oversight, cross-community access, global report viewing, moderation intervention, owner removal, moderator removal, platform statistics, system settings, dispute resolution, platform-wide ban, user suspension, account visibility, content restoration, policy enforcement, platform announcements, guideline compliance}
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [4] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling. {registration, login, authentication, signup, signin}
  - [5] [Session and Token Policy](./01-actors-and-auth.md#session-and-token-policy) — Define session duration, token refresh, and expiration policies. {session, token, refresh, expiration, jwt}
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [6] [Account States and Transitions](./01-actors-and-auth.md#account-states-and-transitions) — Define account states (active, suspended, deleted) and valid transitions. {account-state, lifecycle, suspension, deletion, deactivation}

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [7] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain, its purpose, and how users interact with it. {user registration, account creation, unique username, email authentication, password management, account deletion, login credentials, user identity, duplicate prevention, credential recovery, permanent deletion, user authentication}
  - [8] [Profile Concept](./02-domain-model.md#profile-concept) — Describe what Profile represents in the business domain, its purpose, and how users interact with it. {profile display, display name editing, bio text, avatar image, karma display, user posts list, user comments list, profile viewing, profile customization, public profile, profile information, user identity display}
  - [9] [Community Concept](./02-domain-model.md#community-concept) — Describe what Community represents in the business domain, its purpose, and how users interact with it. {community creation, community ownership, unique community name, community description, community icon, community browsing, community search, subscriber count, community discovery, community identity, topic spaces, community management}
  - [10] [Post Concept](./02-domain-model.md#post-concept) — Describe what Post represents in the business domain, its purpose, and how users interact with it. {post creation, post types, text posts, link posts, image posts, post title, post editing, post deletion, post viewing, subscription requirement, post content, post metadata}
  - [11] [Comment Concept](./02-domain-model.md#comment-concept) — Describe what Comment represents in the business domain, its purpose, and how users interact with it. {comment creation, comment replies, nested comments, comment editing, comment deletion, comment display, threaded discussions, comment author, comment voting, conversation threads, reply chains, comment engagement}
  - [12] [Vote Concept](./02-domain-model.md#vote-concept) — Describe what Vote represents in the business domain, its purpose, and how users interact with it. {upvoting, downvoting, vote changing, vote removal, karma score, karma adjustment, vote score calculation, single vote per item, negative karma, vote impact, content rating, community feedback}
  - [13] [Subscription Concept](./02-domain-model.md#subscription-concept) — Describe what Subscription represents in the business domain, its purpose, and how users interact with it. {community subscription, subscription management, unsubscribe action, subscribed communities list, posting permissions, home feed access, subscription status, community membership, feed personalization, subscription requirements, community following, content filtering}
  - [14] [Report Concept](./02-domain-model.md#report-concept) — Describe what Report represents in the business domain, its purpose, and how users interact with it. {content reporting, report reason, moderator review, report approval, report dismissal, reported content, reporter identity, report status, community moderation, content deletion, guideline violations, safety reporting}
  - [15] [Ban Concept](./02-domain-model.md#ban-concept) — Describe what Ban represents in the business domain, its purpose, and how users interact with it. {user banning, ban enforcement, unban action, banned users list, posting restriction, commenting restriction, content viewing, moderator ban management, community-specific ban, ban scope, participation rights, community enforcement}
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [16] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms. {relationship, association, belongs-to, has-many, ownership}
  - [17] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective. {lifecycle, retention, archival, deletion-policy, recovery}
- [Enums and State Machines](./02-domain-model.md#enums-and-state-machines)
  - [18] [Enum Definitions](./02-domain-model.md#enum-definitions) — Define all enum types with their allowed values and descriptions. {enum, enumeration, allowed-values, status-type}
  - [19] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts. {state-machine, transition, workflow, status-change}

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [20] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective. {user registration flow, email authentication, password management, account deletion cascade, username uniqueness, login credentials, unique email handling, account permanence}
  - [21] [Profile Operations](./03-functional-requirements.md#profile-operations) — Define business operations for Profile: what create, read, update, delete, and list operations must accomplish from a business perspective. {profile editing, display name management, bio text updates, avatar image changes, public profile viewing, karma score display, user post history, user comment history, profile accessibility}
  - [22] [Community Operations](./03-functional-requirements.md#community-operations) — Define business operations for Community: what create, read, update, delete, and list operations must accomplish from a business perspective. {community creation, unique community name, community description, community icon, community browsing, community search, subscriber count display, community ownership, owner privileges}
  - [23] [Post Operations](./03-functional-requirements.md#post-operations) — Define business operations for Post: what create, read, update, delete, and list operations must accomplish from a business perspective. {post creation, post title requirement, text post content, link post URLs, image post uploads, post editing, post deletion, post viewing, subscription requirement, post metadata display, post type selection}
  - [24] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective. {comment creation, comment replies, nested comments, unlimited reply depth, comment editing, comment deletion, comment viewing, threaded discussions, comment metadata, infinite threading, comment ownership}
  - [25] [Vote Operations](./03-functional-requirements.md#vote-operations) — Define business operations for Vote: what create, read, update, delete, and list operations must accomplish from a business perspective. {upvoting posts, downvoting posts, upvoting comments, downvoting comments, vote changing, vote removal, single vote per item, vote score calculation, karma adjustment, negative karma, vote reversal}
  - [26] [Subscription Operations](./03-functional-requirements.md#subscription-operations) — Define business operations for Subscription: what create, read, update, delete, and list operations must accomplish from a business perspective. {community subscription, community unsubscription, subscription list viewing, subscription requirement, post creation eligibility, subscribed communities view, home feed filtering, subscription management, feed personalization}
  - [27] [Report Operations](./03-functional-requirements.md#report-operations) — Define business operations for Report: what create, read, update, delete, and list operations must accomplish from a business perspective. {content reporting, report reason requirement, moderator report viewing, report approval, report dismissal, content deletion, report management, reported content display, violation reporting, report resolution}
  - [28] [Ban Operations](./03-functional-requirements.md#ban-operations) — Define business operations for Ban: what create, read, update, delete, and list operations must accomplish from a business perspective. {user banning, user unbanning, banned users list, ban enforcement, content viewing access, posting restriction, commenting restriction, moderator management, owner privileges, moderator addition, moderator removal}
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [29] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective. {account creation workflow, email uniqueness validation, login authentication flow, password change process, account deletion cascade, permanent content removal, session persistence, authentication requirement, login error handling}
  - [30] [Profile Actions](./03-functional-requirements.md#profile-actions) — Define business actions and workflows for the Profile domain group from a functional requirements perspective. {profile editing workflow, display name update, bio text modification, avatar image upload, public profile viewing, karma score display, user post history, user comment history, immediate change visibility}
  - [31] [Community Actions](./03-functional-requirements.md#community-actions) — Define business actions and workflows for the Community domain group from a functional requirements perspective. {community creation workflow, automatic owner assignment, unique name requirement, community description setup, community icon upload, community browsing interface, community name search, subscriber count display, community ownership rights}
  - [32] [Post Actions](./03-functional-requirements.md#post-actions) — Define business actions and workflows for the Post domain group from a functional requirements perspective. {subscription requirement for posting, post type selection, text post creation, link post creation, image post upload, post editing workflow, post deletion process, feed display formatting, post metadata display}
  - [33] [Comment Actions](./03-functional-requirements.md#comment-actions) — Define business actions and workflows for the Comment domain group from a functional requirements perspective. {comment creation workflow, comment reply nesting, unlimited reply depth, comment editing capability, comment deletion process, comment metadata display, comment sorting options, thread structure preservation, nested reply hierarchy}
  - [34] [Vote Actions](./03-functional-requirements.md#vote-actions) — Define business actions and workflows for the Vote domain group from a functional requirements perspective. {upvote action workflow, downvote action workflow, single vote restriction, vote change capability, vote removal process, vote score calculation, negative score support, karma adjustment trigger, vote direction switching}
  - [35] [Subscription Actions](./03-functional-requirements.md#subscription-actions) — Define business actions and workflows for the Subscription domain group from a functional requirements perspective. {community subscription workflow, community unsubscription process, posting permission requirement, subscription list viewing, home feed filtering, immediate subscription effect, unrestricted subscription changes, community discovery flow, feed personalization}
  - [36] [Report Actions](./03-functional-requirements.md#report-actions) — Define business actions and workflows for the Report domain group from a functional requirements perspective. {content reporting workflow, report reason requirement, moderator report queue, report detail display, report approval action, report dismissal action, content deletion trigger, report list management, community self-moderation}
  - [37] [Ban Actions](./03-functional-requirements.md#ban-actions) — Define business actions and workflows for the Ban domain group from a functional requirements perspective. {moderator addition workflow, moderator removal workflow, owner protection rule, moderator hierarchy enforcement, user ban action, user unban action, banned user list viewing, posting restriction enforcement, commenting restriction enforcement, community-specific ban scope}
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [38] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations. {duplicate email registration, username uniqueness conflict, failed login attempts, account lockout scenario, password verification failure, active session deletion block, account deletion cascade, expired verification link, pending email verification, password reset privacy, unverified account login, account recovery edge cases}
  - [39] [Profile Error Scenarios](./03-functional-requirements.md#profile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Profile operations. {unauthorized profile editing, display name length violation, bio text overflow, avatar size limit exceeded, unsupported image format, deleted account profile view, non-existent user profile, inappropriate avatar content, prohibited bio content, network failure profile update, concurrent edit conflict, profile data preservation}
  - [40] [Community Error Scenarios](./03-functional-requirements.md#community-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Community operations. {duplicate community name, community naming violation, description length exceeded, icon format rejection, empty search results, no communities exist, community rename restriction, restricted account community creation, owner-only community deletion, ownership transfer conditions, failed icon upload rollback, special character handling}
  - [41] [Post Error Scenarios](./03-functional-requirements.md#post-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Post operations. {subscription requirement violation, empty title submission, text post missing content, invalid URL format, unsupported image format, post edit time limit, post type change restriction, reported post deletion block, deleted community post access, banned user post creation, image size limit exceeded, title length overflow}
  - [42] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations. {banned user comment attempt, empty comment submission, deleted parent comment reply, comment edit time limit, substantial edit flagging, moderation review deletion block, nested reply depth limit, deleted post comment access, suspended account commenting, guideline violation rejection, prohibited domain blocking, concurrent comment handling}
  - [43] [Vote Error Scenarios](./03-functional-requirements.md#vote-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Vote operations. {banned user voting attempt, single vote per content rule, vote change score adjustment, vote removal score restoration, self-voting prevention, deleted content vote handling, unauthenticated voting attempt, rapid vote rate limiting, karma calculation consistency, non-existent community voting, vote count update delay, orphaned vote removal}
  - [44] [Subscription Error Scenarios](./03-functional-requirements.md#subscription-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Subscription operations. {non-existent community subscription, duplicate subscription handling, redundant unsubscribe handling, subscription posting requirement, subscription feed sync delay, maximum subscription limit, banned community subscription, unsubscribe content retention, restricted account subscription view, community deletion subscription handling, bulk subscription rate limiting, multi-device subscription conflict}
  - [45] [Report Error Scenarios](./03-functional-requirements.md#report-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Report operations. {self-reporting prevention, empty report reason, duplicate report submission, deleted content reporting, banned user report priority, already deleted content approval, report action conflict, deleted community report access, report status visibility restriction, multiple reporter deduplication, report reason length limit, maintenance queue reporting}
  - [46] [Ban Error Scenarios](./03-functional-requirements.md#ban-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Ban operations. {unauthorized ban attempt, moderator ban protection, owner ban immunity, existing ban update, redundant unban handling, banned user view-only access, self-ban prevention, current ban list scope, moderator removal ban conflict, ban content retention, single community ban scope, ban enforcement propagation}
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [47] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective. {account registration flow, email password login, password change process, account deletion cascade, username uniqueness enforcement, email verification requirement, unique email handling, permanent account removal}
  - [48] [Profile User Scenarios](./03-functional-requirements.md#profile-user-scenarios) — Define end-to-end user scenarios involving Profile and related concepts, describing business flows from the user's perspective. {profile viewing access, display name editing, bio text modification, avatar image upload, karma score display, user post listing, user comment listing, profile ownership rights}
  - [49] [Community User Scenarios](./03-functional-requirements.md#community-user-scenarios) — Define end-to-end user scenarios involving Community and related concepts, describing business flows from the user's perspective. {community creation flow, community ownership assignment, community browsing list, community name search, subscriber count display, unique community name, community page viewing, owner privilege distinction}
  - [50] [Post User Scenarios](./03-functional-requirements.md#post-user-scenarios) — Define end-to-end user scenarios involving Post and related concepts, describing business flows from the user's perspective. {post creation subscription requirement, post type selection, text link image posts, post editing capability, post deletion ownership, post detail viewing, post feed sorting, title requirement enforcement}
  - [51] [Comment User Scenarios](./03-functional-requirements.md#comment-user-scenarios) — Define end-to-end user scenarios involving Comment and related concepts, describing business flows from the user's perspective. {comment creation on posts, comment reply nesting, unlimited reply depth, comment editing ownership, comment deletion capability, comment thread display, comment sorting options, nested reply visualization}
  - [52] [Vote User Scenarios](./03-functional-requirements.md#vote-user-scenarios) — Define end-to-end user scenarios involving Vote and related concepts, describing business flows from the user's perspective. {post upvoting action, post downvoting action, comment upvoting action, comment downvoting action, vote changing capability, vote removal option, karma score adjustment, single vote per user, vote score calculation, negative karma possibility}
  - [53] [Subscription User Scenarios](./03-functional-requirements.md#subscription-user-scenarios) — Define end-to-end user scenarios involving Subscription and related concepts, describing business flows from the user's perspective. {community subscription action, community unsubscription action, subscription list viewing, posting subscription requirement, home feed personalization, logged-in home access, browse without subscribing, subscription feed filtering}
  - [54] [Report User Scenarios](./03-functional-requirements.md#report-user-scenarios) — Define end-to-end user scenarios involving Report and related concepts, describing business flows from the user's perspective. {content reporting capability, report reason requirement, moderator report viewing, reported content display, reporter identity display, report approval deletion, report dismissal retention, dismissed report removal}
  - [55] [Ban User Scenarios](./03-functional-requirements.md#ban-user-scenarios) — Define end-to-end user scenarios involving Ban and related concepts, describing business flows from the user's perspective. {moderator ban action, moderator unban action, banned user list viewing, ban posting restriction, ban commenting restriction, ban viewing allowance, owner moderator management, moderator removal authority}
- [File Storage](./03-functional-requirements.md#file-storage)
  - [56] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files. {file-upload, media, storage, attachment}

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [57] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access. {ownership, isolation, tenant, multi-user, data-access}
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [58] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User. {user registration flow, unique username selection, email uniqueness constraint, password change capability, account deletion cascade, login credential validation, permanent username policy, single account per email}
  - [59] [Profile Rules](./04-business-rules.md#profile-rules) — Define business rules, validation logic, and domain constraints for Profile. {profile editing rights, display name customization, bio text optional, avatar image upload, public profile visibility, karma score display, user post history, user comment history}
  - [60] [Community Rules](./04-business-rules.md#community-rules) — Define business rules, validation logic, and domain constraints for Community. {community creation rights, unique community name, community description text, community icon image, automatic owner assignment, community browsing list, community name search, subscriber count display}
  - [61] [Post Rules](./04-business-rules.md#post-rules) — Define business rules, validation logic, and domain constraints for Post. {subscription requirement for posting, mandatory post title, text post content, link post URL, image post upload, post editing capability, post deletion rights, post type selection}
  - [62] [Comment Rules](./04-business-rules.md#comment-rules) — Define business rules, validation logic, and domain constraints for Comment. {comment creation rights, comment reply capability, unlimited nesting depth, comment editing rights, comment deletion rights, comment display information, threaded comment structure, comment voting mechanics}
  - [63] [Vote Rules](./04-business-rules.md#vote-rules) — Define business rules, validation logic, and domain constraints for Vote. {upvote action effect, downvote action effect, single vote per user, vote change capability, vote removal option, vote score calculation, karma increase on upvote, karma decrease on downvote, negative karma allowed}
  - [64] [Subscription Rules](./04-business-rules.md#subscription-rules) — Define business rules, validation logic, and domain constraints for Subscription. {community subscription action, community unsubscription action, subscribed communities list, subscription posting requirement, home feed subscription filter, logged-in home feed access, unlimited community subscriptions, subscription status tracking}
  - [65] [Report Rules](./04-business-rules.md#report-rules) — Define business rules, validation logic, and domain constraints for Report. {content reporting capability, mandatory report reason, moderator report viewing, reported content display, reporter identity shown, report approval action, report dismissal action, content deletion on approval}
  - [66] [Ban Rules](./04-business-rules.md#ban-rules) — Define business rules, validation logic, and domain constraints for Ban. {moderator ban capability, moderator unban capability, banned users list viewing, posting restriction for banned, commenting restriction for banned, viewing access for banned, owner ban authority, moderator ban permissions}
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [67] [User Validation Rules](./04-business-rules.md#user-validation-rules) — Define validation rules for User, including boundary values and format requirements. {email format validation, username uniqueness check, password complexity requirements, email verification flow, verification link expiration, duplicate email rejection, username availability check, account deletion cascade, password change authentication, registration rate limiting}
  - [68] [Profile Validation Rules](./04-business-rules.md#profile-validation-rules) — Define validation rules for Profile, including boundary values and format requirements. {display name length limits, bio text maximum length, avatar image format support, avatar file size limits, profile update validation, empty display name rejection, bio content sanitization, avatar dimension requirements, avatar removal option, default avatar fallback}
  - [69] [Community Validation Rules](./04-business-rules.md#community-validation-rules) — Define validation rules for Community, including boundary values and format requirements. {community name uniqueness, community naming conventions, description character limits, icon image format validation, icon file size restrictions, community name immutability, description update validation, icon upload processing, duplicate name rejection, special character restrictions}
  - [70] [Post Validation Rules](./04-business-rules.md#post-validation-rules) — Define validation rules for Post, including boundary values and format requirements. {title required validation, title character limits, post type classification, text post content length, link post URL format, image post format support, image file size limits, post type immutability, empty title rejection, URL accessibility validation, image dimension requirements, post content sanitization}
  - [71] [Comment Validation Rules](./04-business-rules.md#comment-validation-rules) — Define validation rules for Comment, including boundary values and format requirements. {comment content required, comment maximum length, comment content sanitization, nested reply validation, comment edit validation, deleted comment handling, text formatting support, empty comment rejection, comment length enforcement, reply depth unlimited, placeholder indicator display}
  - [72] [Vote Validation Rules](./04-business-rules.md#vote-validation-rules) — Define validation rules for Vote, including boundary values and format requirements. {vote direction validation, single vote per user, vote change allowed, vote removal option, vote transition validation, duplicate vote rejection, vote removal action, vote timestamp recording, self-vote prevention, karma calculation tracking, upvote downvote options}
  - [73] [Subscription Validation Rules](./04-business-rules.md#subscription-validation-rules) — Define validation rules for Subscription, including boundary values and format requirements. {subscription existence check, user authentication required, duplicate subscription prevention, unsubscribe validation, subscription posting requirement, community existence validation, subscription status check, subscription timestamp recording, subscription list validation, valid subscription display}
  - [74] [Report Validation Rules](./04-business-rules.md#report-validation-rules) — Define validation rules for Report, including boundary values and format requirements. {report reason required, report reason length limits, report status transitions, duplicate report prevention, report content validation, report reason sanitization, approved report deletion, dismissed report removal, reported content existence, pending report status, report submission validation}
  - [75] [Ban Validation Rules](./04-business-rules.md#ban-validation-rules) — Define validation rules for Ban, including boundary values and format requirements. {ban reason optional, community level ban, ban duration options, banned user view access, banned user post restriction, user existence validation, duplicate ban prevention, ban removal restoration, ban timestamp recording, moderator authority validation, temporary permanent ban}
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [76] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations. {filtering, sorting, pagination, cursor, query}
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [77] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language. {error-scenario, rejection, failure-case, exception}
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [78] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files. {file-validation, virus-scan, content-type, retention}

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [79] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements. {performance, slo, latency, throughput, scalability}
  - [80] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements. {rate-limit, throttling, abuse-prevention, cooldown}
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [81] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance. {security, encryption, compliance, input-validation, owasp}
  - [82] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies. {availability, uptime, error-budget, reliability}
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [83] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements. {data-integrity, backup, retention, storage, consistency}
  - [84] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements. {audit, logging, monitoring, alerting, observability}
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [85] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations. {concurrency, locking, conflict-resolution, race-condition, retry-semantics}
  - [86] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees. {consistency, transaction-boundary, atomicity, idempotency}
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [87] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage. {storage-capacity, cdn, capacity}

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

- **User**: email: string, unique, username: string, unique, password: hashed, karma: integer, can be negative
- **Profile**: displayName: string, bio: text, avatarUrl: string
- **Community**: name: string, unique, description: text, iconUrl: string, subscriberCount: integer
- **Post**: title: string, required, type: enum(text|link|image), content: text or url or imageUrl, voteScore: integer, commentCount: integer, createdAt: datetime
- **Comment**: content: text, voteScore: integer, createdAt: datetime
- **Vote**: direction: enum(up|down), createdAt: datetime
- **Subscription**: createdAt: datetime
- **Report**: reason: text, status: enum(pending|approved|dismissed), createdAt: datetime
- **Ban**: reason: text, optional, createdAt: datetime

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