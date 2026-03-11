### Table of Contents

**discussionBoard** is a backend service with the following actors and domain entities.

**Actors**: guest, member, admin
**Entities**: User, Section, Article, Comment, AdminRequest, Ban

---

**Scope**

- **User**: email address for authentication, password credential, display name shown publicly, biography text, account status | Relationships: writes Articles, writes Comments, can be banned, can request administrator status
- **Section**: name, description | Relationships: contains Articles, managed by Administrators
- **Article**: title, content text, tags, attachments, creation time | Relationships: belongs to a Section, written by a User, has Comments
- **Comment**: content text, creation time | Relationships: written by a User, belongs to an Article
- **AdminRequest**: reason text, request status | Relationships: submitted by a User, reviewed by Super Administrators
- **Ban**: ban reason, ban time | Relationships: applied to a User, recorded by an Administrator

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
  - [1] [guest Actor](./01-actors-and-auth.md#guest-actor) — Define the guest actor's role and capabilities in business terms. {public browsing, section viewing, article list access, article viewing, search functionality, tag filtering, profile viewing, unauthenticated access, read-only permissions, content discovery, no posting rights, no account features, platform exploration, anonymous viewing}
  - [2] [member Actor](./01-actors-and-auth.md#member-actor) — Define the member actor's role and capabilities in business terms. {article creation, content editing, comment posting, profile management, account deletion, password changes, admin requests, own content management, full participation, authenticated user, discussion participation, personal settings, content ownership, account lifecycle, email authentication, attachment uploading, tag management}
  - [3] [admin Actor](./01-actors-and-auth.md#admin-actor) — Define the admin actor's role and capabilities in business terms. {section management, content moderation, user banning, admin requests approval, grade promotion, ban management, elevated permissions, platform governance, content deletion, user management, admin hierarchy, super admin powers, regular admin capabilities, moderation authority, ban reasons, request review, privilege escalation, community standards}
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [4] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling. {registration, login, authentication, signup, signin}
  - [5] [Session and Token Policy](./01-actors-and-auth.md#session-and-token-policy) — Define session duration, token refresh, and expiration policies. {session, token, refresh, expiration, jwt}
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [6] [Account States and Transitions](./01-actors-and-auth.md#account-states-and-transitions) — Define account states (active, suspended, deleted) and valid transitions. {account-state, lifecycle, suspension, deletion, deactivation}

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [7] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain, its purpose, and how users interact with it. {user account creation, email authentication, user profile management, display name and bio, article authorship, comment participation, administrator request eligibility, account deletion consequences, profile visibility, ban susceptibility}
  - [8] [Section Concept](./02-domain-model.md#section-concept) — Describe what Section represents in the business domain, its purpose, and how users interact with it. {topic organization, section name and description, administrator management, section browsing, article categorization, content discovery, Politics section, Economy section, Current Affairs section, section list viewing, mandatory article assignment, community structure}
  - [9] [Article Concept](./02-domain-model.md#article-concept) — Describe what Article represents in the business domain, its purpose, and how users interact with it. {article creation, title and content requirements, section assignment, file attachments, image attachments, tag management, article editing rights, article deletion rights, article list display, article detail viewing, attachment downloads, discussion foundation}
  - [10] [Comment Concept](./02-domain-model.md#comment-concept) — Describe what Comment represents in the business domain, its purpose, and how users interact with it. {comment creation, single-level structure, comment display format, oldest first sorting, comment editing rights, comment deletion rights, article association, discussion facilitation, author visibility, ban persistence, comment viewing, feedback mechanism}
  - [11] [AdminRequest Concept](./02-domain-model.md#adminrequest-concept) — Describe what AdminRequest represents in the business domain, its purpose, and how users interact with it. {administrator application, reason submission, pending request queue, super administrator review, approval process, rejection process, regular administrator promotion, privilege escalation pathway, request status tracking, community governance, administrator selection, user advancement}
  - [12] [Ban Concept](./02-domain-model.md#ban-concept) — Describe what Ban represents in the business domain, its purpose, and how users interact with it. {access restriction, login prohibition, content preservation, ban reason recording, administrator ban authority, administrator unban authority, banned user list, policy enforcement, community protection, administrative transparency, violation documentation, platform standards}
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [13] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms. {relationship, association, belongs-to, has-many, ownership}
  - [14] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective. {lifecycle, retention, archival, deletion-policy, recovery}
- [Enums and State Machines](./02-domain-model.md#enums-and-state-machines)
  - [15] [Enum Definitions](./02-domain-model.md#enum-definitions) — Define all enum types with their allowed values and descriptions. {enum, enumeration, allowed-values, status-type}
  - [16] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts. {state-machine, transition, workflow, status-change}

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [17] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective. {account creation flow, login authentication, password change, account deletion cascade, profile display name, profile bio editing, view other profiles, profile article list, profile comment list, unique email requirement, permanent account removal}
  - [18] [Section Operations](./03-functional-requirements.md#section-operations) — Define business operations for Section: what create, read, update, delete, and list operations must accomplish from a business perspective. {administrator section creation, section name management, section description editing, administrator section deletion, view all sections list, browse articles by section, section categorization, section topic organization, admin-only section management, section content filtering}
  - [19] [Article Operations](./03-functional-requirements.md#article-operations) — Define business operations for Article: what create, read, update, delete, and list operations must accomplish from a business perspective. {article creation flow, article title requirement, article content requirement, section assignment, file attachment upload, image attachment upload, multiple attachments support, article tagging, edit own article, delete own article, article list pagination, article sorting options, view full article, download attachments, search by title content, filter by tags}
  - [20] [Comment Operations](./03-functional-requirements.md#comment-operations) — Define business operations for Comment: what create, read, update, delete, and list operations must accomplish from a business perspective. {comment creation flow, single-level comments only, no nested replies, view all article comments, oldest first sorting, comment author display, comment content display, comment timestamp, edit own comment, delete own comment, comment cascade deletion, article discussion thread}
  - [21] [AdminRequest Operations](./03-functional-requirements.md#adminrequest-operations) — Define business operations for AdminRequest: what create, read, update, delete, and list operations must accomplish from a business perspective. {admin request submission, request reason requirement, super admin view requests, approve admin request, reject admin request, pending request list, regular administrator promotion, request record keeping, no request withdrawal, privilege elevation process, admin application workflow}
  - [22] [Ban Operations](./03-functional-requirements.md#ban-operations) — Define business operations for Ban: what create, read, update, delete, and list operations must accomplish from a business perspective. {administrator ban user, administrator unban user, view banned users list, banned user login blocked, banned content visibility, ban reason recording, view ban reason, ban preserves content, unban restores access, community enforcement, user access restriction, ban transparency}
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [23] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective. {account registration flow, login authentication workflow, password change process, profile editing workflow, account deletion cascade, profile viewing access, credential validation, authentication state management, user identity verification, account removal workflow}
  - [24] [Section Actions](./03-functional-requirements.md#section-actions) — Define business actions and workflows for the Section domain group from a functional requirements perspective. {section creation workflow, section editing process, section deletion workflow, section list viewing, article browsing by section, administrator section management, section organization workflow, topic categorization process, section access control, administrative content management}
  - [25] [Article Actions](./03-functional-requirements.md#article-actions) — Define business actions and workflows for the Article domain group from a functional requirements perspective. {article creation workflow, article editing process, article deletion workflow, file attachment workflow, image attachment process, tag management workflow, article search functionality, tag filtering process, article sorting options, article list pagination, administrative article deletion, section selection requirement, multi-attachment support, content update workflow}
  - [26] [Comment Actions](./03-functional-requirements.md#comment-actions) — Define business actions and workflows for the Comment domain group from a functional requirements perspective. {comment creation workflow, comment viewing process, comment editing workflow, comment deletion process, chronological comment sorting, single-level comment structure, administrative comment deletion, comment author attribution, timestamp display workflow, authenticated comment posting, comment ownership management, discussion participation flow}
  - [27] [AdminRequest Actions](./03-functional-requirements.md#adminrequest-actions) — Define business actions and workflows for the AdminRequest domain group from a functional requirements perspective. {admin request submission workflow, request approval process, request rejection workflow, pending request viewing, administrator promotion workflow, administrator demotion process, super administrator privileges, grade change authorization, self-demotion restriction, administrator role transition, request status management, elevated access granting}
  - [28] [Ban Actions](./03-functional-requirements.md#ban-actions) — Define business actions and workflows for the Ban domain group from a functional requirements perspective. {user banning workflow, ban reason recording, login restriction enforcement, user unbanning process, banned users list viewing, ban reason visibility, content preservation during ban, authentication blocking workflow, administrative ban management, ban status tracking, access restoration workflow, user account suspension}
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [29] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations. {duplicate email registration, invalid credentials login, banned user login attempt, password change failure, account deletion conflict, profile edit restrictions, display name validation, bio length limits, expired password reset, login rate limiting, deleted account viewing, email change conflict}
  - [30] [Section Error Scenarios](./03-functional-requirements.md#section-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Section operations. {non-admin section creation, duplicate section name, section description length, section with articles deletion, section name conflict, deleted section browsing, prohibited section content, section permission denied, non-existent section viewing, concurrent section editing, active article section deletion, section update conflict}
  - [31] [Article Error Scenarios](./03-functional-requirements.md#article-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Article operations. {missing required article fields, invalid section selection, unauthorized article editing, deleted article access, tag count limits, file size exceeded, unsupported image format, restricted section publishing, concurrent article editing, duplicate article titles, prohibited tag content, deleted section article access}
  - [32] [Comment Error Scenarios](./03-functional-requirements.md#comment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Comment operations. {deleted article commenting, empty comment submission, unauthorized comment editing, deleted comment access, banned user article commenting, comment length limits, restricted section commenting, comment rate limiting, concurrent comment editing, draft article commenting, comment edit time window, article deletion comment cascade}
  - [33] [AdminRequest Error Scenarios](./03-functional-requirements.md#adminrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdminRequest operations. {duplicate admin request, admin requesting admin status, missing request reason, already admin approval, rejected request reprocessing, duplicate approval attempt, request withdrawal blocked, self approval prevention, approved request rejection, concurrent approval conflict, banned user request, unauthorized request viewing}
  - [34] [Ban Error Scenarios](./03-functional-requirements.md#ban-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Ban operations. {duplicate user banning, missing ban reason, super admin ban attempt, banned user login, unbanning non-banned user, ban reason length limits, self-ban prevention, unauthorized ban reason viewing, banned user content visibility, concurrent ban conflict, unban privilege restoration, ban history retention}
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [35] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective. {account registration flow, email verification process, login authentication, profile editing workflow, viewing other user profiles, password change process, account deletion cascade, banned user login restriction, user article history, user comment history, profile content aggregation}
  - [36] [Section User Scenarios](./03-functional-requirements.md#section-user-scenarios) — Define end-to-end user scenarios involving Section and related concepts, describing business flows from the user's perspective. {browsing all sections, viewing section details, navigating to section articles, administrator section creation, administrator section editing, administrator section deletion, section access restriction, topic category organization, section list navigation, section-based article browsing}
  - [37] [Article User Scenarios](./03-functional-requirements.md#article-user-scenarios) — Define end-to-end user scenarios involving Article and related concepts, describing business flows from the user's perspective. {article creation workflow, section selection for articles, file attachment process, image attachment process, multiple attachment handling, tag addition workflow, article editing flow, article deletion process, article search by content, tag-based article filtering, article list sorting, article detail viewing, attachment download process, administrator article deletion}
  - [38] [Comment User Scenarios](./03-functional-requirements.md#comment-user-scenarios) — Define end-to-end user scenarios involving Comment and related concepts, describing business flows from the user's perspective. {comment creation on articles, viewing all article comments, comment chronological display, comment editing workflow, comment deletion process, single-level comment structure, no nested replies, administrator comment deletion, discussion participation flow, comment author attribution, comment timestamp display}
  - [39] [AdminRequest User Scenarios](./03-functional-requirements.md#adminrequest-user-scenarios) — Define end-to-end user scenarios involving AdminRequest and related concepts, describing business flows from the user's perspective. {admin request submission, reason text requirement, pending request queue, super admin request review, request approval workflow, request rejection process, regular admin promotion, super admin promotion, super admin demotion, self-demotion prevention, admin capability inheritance, administrator grade management}
  - [40] [Ban User Scenarios](./03-functional-requirements.md#ban-user-scenarios) — Define end-to-end user scenarios involving Ban and related concepts, describing business flows from the user's perspective. {user banning process, ban reason recording, login restriction for banned users, banned user content visibility, viewing banned users list, viewing ban reasons, user unbanning workflow, restoring user access, discussion history preservation, administrator ban management, platform rule enforcement}
- [File Storage](./03-functional-requirements.md#file-storage)
  - [41] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files. {file-upload, media, storage, attachment}

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [42] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access. {ownership, isolation, tenant, multi-user, data-access}
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [43] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User. {user registration, email authentication, password change, account deletion cascade, profile editing, display name management, bio management, profile viewing, banned user login restriction, email uniqueness}
  - [44] [Section Rules](./04-business-rules.md#section-rules) — Define business rules, validation logic, and domain constraints for Section. {section creation, administrator-only management, section editing, section deletion, section name, section description, section listing, article browsing by section, section uniqueness, topical categorization}
  - [45] [Article Rules](./04-business-rules.md#article-rules) — Define business rules, validation logic, and domain constraints for Article. {article creation, article title requirement, article content requirement, section assignment, file attachment, image attachment, multiple attachments, tag management, article editing, article deletion, administrator article deletion, article ownership, banned user article visibility}
  - [46] [Comment Rules](./04-business-rules.md#comment-rules) — Define business rules, validation logic, and domain constraints for Comment. {comment creation, single-level comments, no nested replies, comment viewing, comment display order, oldest first sorting, comment editing, comment deletion, administrator comment deletion, comment ownership, banned user comment visibility, article comment association}
  - [47] [AdminRequest Rules](./04-business-rules.md#adminrequest-rules) — Define business rules, validation logic, and domain constraints for AdminRequest. {admin request submission, request reason, super administrator review, request approval, request rejection, pending request status, approved request status, rejected request status, regular administrator promotion, request processing authority, single pending request}
  - [48] [Ban Rules](./04-business-rules.md#ban-rules) — Define business rules, validation logic, and domain constraints for Ban. {user banning, user unbanning, banned users list, login restriction, content visibility preservation, ban reason recording, ban reason viewing, administrator ban authority, ban status override, account access restoration}
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [49] [User Validation Rules](./04-business-rules.md#user-validation-rules) — Define validation rules for User, including boundary values and format requirements. {email format validation, email uniqueness constraint, password complexity requirements, password minimum length, display name character limits, display name content restrictions, bio text maximum length, bio text formatting rules, account deletion cascade, account deletion irreversibility, email verification requirement, password change verification, password reuse prevention, account lockout threshold}
  - [50] [Section Validation Rules](./04-business-rules.md#section-validation-rules) — Define validation rules for Section, including boundary values and format requirements. {section name minimum length, section name maximum length, section name uniqueness, section name character restrictions, section description maximum length, section description formatting, administrator section creation, administrator section editing, administrator section deletion, section deletion article handling, section required fields, section name clarity requirement, section description context requirement, duplicate section rejection}
  - [51] [Article Validation Rules](./04-business-rules.md#article-validation-rules) — Define validation rules for Article, including boundary values and format requirements. {article title required, article title minimum length, article title maximum length, article content required, article content minimum length, article content maximum length, article section selection required, article single section assignment, multiple file attachments allowed, file attachment size limit, image attachment size limit, supported image formats, supported file formats, multiple tags allowed, tag character limits, tag special character restrictions, duplicate tag consolidation, article edit ownership, article delete ownership, article timestamp preservation}
  - [52] [Comment Validation Rules](./04-business-rules.md#comment-validation-rules) — Define validation rules for Comment, including boundary values and format requirements. {comment content required, comment content minimum length, comment content maximum length, single-level comment structure, no nested replies allowed, comment article association, comment inaccessible article handling, comment edit ownership, comment delete ownership, comment timestamp preservation, comment deletion permanence, comment author display, comment oldest first sorting, administrator comment removal, comment login requirement, multiple comments per article}
  - [53] [AdminRequest Validation Rules](./04-business-rules.md#adminrequest-validation-rules) — Define validation rules for AdminRequest, including boundary values and format requirements. {admin request reason required, request reason minimum length, request reason maximum length, single pending request limit, duplicate request rejection, request reason justification requirement, request reason content restrictions, super admin request viewing, super admin request approval, super admin request rejection, approval status conversion, rejection waiting period, request status tracking, request submission timestamp, request decision audit trail, pending request state, approved request state, rejected request state}
  - [54] [Ban Validation Rules](./04-business-rules.md#ban-validation-rules) — Define validation rules for Ban, including boundary values and format requirements. {ban reason required, ban reason minimum length, ban reason maximum length, ban reason justification requirement, ban reason content restrictions, ban time automatic recording, ban time immutability, banned user login prevention, banned user article visibility, banned user comment visibility, administrator ban capability, administrator unban capability, banned user list viewing, ban reason administrator viewing, ban time administrator viewing, ban record overwriting, unban login restoration, ban history audit preservation}
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [55] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations. {filtering, sorting, pagination, cursor, query}
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [56] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language. {error-scenario, rejection, failure-case, exception}
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [57] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files. {file-validation, virus-scan, content-type, retention}

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [58] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements. {performance, slo, latency, throughput, scalability}
  - [59] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements. {rate-limit, throttling, abuse-prevention, cooldown}
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [60] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance. {security, encryption, compliance, input-validation, owasp}
  - [61] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies. {availability, uptime, error-budget, reliability}
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [62] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements. {data-integrity, backup, retention, storage, consistency}
  - [63] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements. {audit, logging, monitoring, alerting, observability}
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [64] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations. {concurrency, locking, conflict-resolution, race-condition, retry-semantics}
  - [65] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees. {consistency, transaction-boundary, atomicity, idempotency}
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [66] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage. {storage-capacity, cdn, capacity}

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

- **User**: email address for authentication, password credential, display name shown publicly, biography text, account status
- **Section**: name, description
- **Article**: title, content text, tags, attachments, creation time
- **Comment**: content text, creation time
- **AdminRequest**: reason text, request status
- **Ban**: ban reason, ban time

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