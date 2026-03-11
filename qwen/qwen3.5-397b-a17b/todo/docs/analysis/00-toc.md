### Table of Contents

**todoApp** is a backend service with the following actors and domain entities.

**Actors**: guest, member
**Entities**: User, Todo, TodoHistory

---

**Scope**

- **User**: email: string, unique, required, password: string, required, displayName: string, required | Relationships: has many Todo
- **Todo**: title: string, required, description: string, optional, startDate: date, optional, dueDate: date, optional, completed: boolean, default false, deletedAt: timestamp, optional for soft delete, createdAt: timestamp, required | Relationships: belongsTo User via userId, has many TodoHistory
- **TodoHistory**: editedAt: timestamp, required, newTitle: string, optional, newDescription: string, optional, newStartDate: date, optional, newDueDate: date, optional | Relationships: belongsTo Todo via todoId

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
| [04-business-rules.md](./04-business-rules.md) | Data isolation, business rules, filtering/sorting/pagination, error catalog | service-layer |
| [05-non-functional.md](./05-non-functional.md) | Performance SLOs, security policies, data integrity, storage requirements | test-infra |

**Section Navigation**

> Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })`

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [guest Actor](./01-actors-and-auth.md#guest-actor) — Define the guest actor's role and capabilities in business terms. {unauthenticated visitor access, registration page access, login page access, account creation capability, authentication entry point, rate limiting on auth attempts, no todo access, no profile access, credential submission, email existence concealment, member transition pathway, public page access, session initiation, authentication error handling}
  - [2] [member Actor](./01-actors-and-auth.md#member-actor) — Define the member actor's role and capabilities in business terms. {authenticated user access, personal todo management, todo creation capability, todo editing capability, todo deletion capability, completion status toggle, edit history viewing, trash management, todo restoration, permanent deletion, list filtering, list sorting, profile display name editing, password change, account deletion, data privacy isolation, own account scope, no cross-user access}
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [3] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling. {registration, login, authentication, signup, signin}
  - [4] [Session and Token Policy](./01-actors-and-auth.md#session-and-token-policy) — Define session duration, token refresh, and expiration policies. {session, token, refresh, expiration, jwt}
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [5] [Account States and Transitions](./01-actors-and-auth.md#account-states-and-transitions) — Define account states (active, suspended, deleted) and valid transitions. {account-state, lifecycle, suspension, deletion, deactivation}

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [6] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain, its purpose, and how users interact with it. {user account, email authentication, profile management, display name, account deletion, user privacy, credential management, account ownership, private profiles, password changes, user registration, login credentials, account security, data isolation}
  - [7] [Todo Concept](./02-domain-model.md#todo-concept) — Describe what Todo represents in the business domain, its purpose, and how users interact with it. {task creation, todo title, optional description, start date, due date, completion status, todo ownership, soft delete, trash management, todo filtering, todo sorting, incomplete default, task tracking, date fields, todo list}
  - [8] [TodoHistory Concept](./02-domain-model.md#todohistory-concept) — Describe what TodoHistory represents in the business domain, its purpose, and how users interact with it. {edit tracking, change history, modification log, timestamp recording, title changes, description changes, date modifications, history viewing, chronological ordering, audit trail, permanent deletion, history cleanup, edit transparency, version tracking, change records}
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [9] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms. {relationship, association, belongs-to, has-many, ownership}
  - [10] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective. {lifecycle, retention, archival, deletion-policy, recovery}
- [Enums and State Machines](./02-domain-model.md#enums-and-state-machines)
  - [11] [Enum Definitions](./02-domain-model.md#enum-definitions) — Define all enum types with their allowed values and descriptions. {enum, enumeration, allowed-values, status-type}
  - [12] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts. {state-machine, transition, workflow, status-change}

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [13] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective. {account registration flow, email uniqueness validation, user authentication process, password change workflow, account deletion cascade, profile display name editing, user privacy isolation, private profile access, todo ownership enforcement, account data removal, user credential management, display name requirement, cross-user access prevention, permanent account deletion, user data isolation}
  - [14] [Todo Operations](./03-functional-requirements.md#todo-operations) — Define business operations for Todo: what create, read, update, delete, and list operations must accomplish from a business perspective. {todo creation workflow, required title validation, optional date fields, incomplete default status, paginated todo listing, todo detail viewing, completion status toggle, todo editing capabilities, soft delete behavior, trash restoration, permanent deletion, completion status filtering, date-based sorting, null date handling, todo privacy enforcement, user todo isolation, trash view access, sort order options}
  - [15] [TodoHistory Operations](./03-functional-requirements.md#todohistory-operations) — Define business operations for TodoHistory: what create, read, update, delete, and list operations must accomplish from a business perspective. {automatic history creation, edit timestamp recording, field change tracking, modified value capture, history view access, chronological ordering, recent-first sorting, permanent deletion cascade, history audit trail, read-only history entries, todo modification log, field-level change recording, history entry structure, edit history visibility, history cleanup on deletion, todo state changes, modification tracking, history immutability}
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [16] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective. {account registration flow, email uniqueness validation, login authentication process, password change workflow, account deletion cascade, permanent data removal, display name editing, profile privacy enforcement, user isolation boundary, authentication requirement, irreversible account deletion, private profile access, secure credential management, user data ownership, complete account removal}
  - [17] [Todo Actions](./03-functional-requirements.md#todo-actions) — Define business actions and workflows for the Todo domain group from a functional requirements perspective. {todo creation workflow, required title validation, optional date fields, completion status toggle, todo editing process, soft delete mechanism, trash restoration flow, permanent deletion cascade, completion status filtering, date-based sorting, pagination handling, todo detail viewing, owner-only access, privacy enforcement, sort order options, empty date handling, list display formatting}
  - [18] [TodoHistory Actions](./03-functional-requirements.md#todohistory-actions) — Define business actions and workflows for the TodoHistory domain group from a functional requirements perspective. {automatic history creation, edit timestamp recording, title change tracking, description change logging, date modification history, history viewing access, reverse chronological order, audit trail maintenance, automatic entry generation, history cascade deletion, trash restoration preservation, immutable history entries, edit operation tracking, history integrity enforcement, single edit representation, complete change record, todo lifecycle tracking}
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [19] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations. {duplicate email registration, invalid login credentials, password verification failure, permanent account deletion, empty display name rejection, login rate limiting, invalid email format, cross-user access denial, session expiration handling, password requirement violations}
  - [20] [Todo Error Scenarios](./03-functional-requirements.md#todo-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Todo operations. {missing title creation failure, cross-user todo access denial, non-existent todo viewing, trash restoration failure, null start date sorting, null due date sorting, empty pagination results, no matching filter results, date ordering flexibility, permanent deletion cascades}
  - [21] [TodoHistory Error Scenarios](./03-functional-requirements.md#todohistory-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all TodoHistory operations. {non-existent todo history, cross-user history access denial, permanently deleted history loss, empty history for new todos, reverse chronological ordering, history immutability, trash history accessibility, new value recording only, multiple edit entries, ownership-based history access}
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [22] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective. {account signup flow, login authentication, password change process, display name editing, account deletion cascade, permanent data removal, profile management workflow, private account isolation, user authentication sequence, credential-based access, account lifecycle management, complete data cleanup}
  - [23] [Todo User Scenarios](./03-functional-requirements.md#todo-user-scenarios) — Define end-to-end user scenarios involving Todo and related concepts, describing business flows from the user's perspective. {todo creation workflow, todo list pagination, completion status toggle, todo detail viewing, todo editing process, soft delete to trash, trash restoration flow, permanent deletion from trash, completion status filtering, multi-criteria sorting, date-based ordering, private todo isolation, optional date fields, required title validation, todo list navigation}
  - [24] [TodoHistory User Scenarios](./03-functional-requirements.md#todohistory-user-scenarios) — Define end-to-end user scenarios involving TodoHistory and related concepts, describing business flows from the user's perspective. {automatic history recording, edit timestamp tracking, field change documentation, history viewing workflow, chronological history display, recent-to-oldest ordering, permanent deletion cascade, history preservation on restore, complete audit trail, multi-field edit capture, history immutability, edit tracking automation, todo evolution tracking}

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [25] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access. {ownership, isolation, tenant, multi-user, data-access}
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [26] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User. {user registration process, email uniqueness requirement, password authentication, password change capability, display name management, account deletion consequences, cross-user privacy isolation, profile editing rights, permanent data removal, user data ownership, account lifecycle management, user identity verification, private profile enforcement}
  - [27] [Todo Rules](./04-business-rules.md#todo-rules) — Define business rules, validation logic, and domain constraints for Todo. {todo creation requirements, optional description field, start date assignment, due date setting, default incomplete status, completion state toggle, todo editing capabilities, soft delete behavior, todo ownership isolation, cross-user access prevention, private todo enforcement, title modification rights, date field updates, todo lifecycle management, user-specific todo visibility}
  - [28] [TodoHistory Rules](./04-business-rules.md#todohistory-rules) — Define business rules, validation logic, and domain constraints for TodoHistory. {automatic history creation, edit timestamp recording, title change tracking, description change tracking, start date change tracking, due date change tracking, history viewing access, chronological history ordering, history deletion on permanent removal, complete change audit trail, recent-to-oldest sorting, edit record preservation, todo modification history, historical data management, change documentation requirement}
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [29] [User Validation Rules](./04-business-rules.md#user-validation-rules) — Define validation rules for User, including boundary values and format requirements. {email format validation, unique email constraint, password security requirements, display name required, display name character rules, password change validation, duplicate email rejection, invalid email handling, empty display name prevention}
  - [30] [Todo Validation Rules](./04-business-rules.md#todo-validation-rules) — Define validation rules for Todo, including boundary values and format requirements. {title required validation, title character limits, empty title prevention, description optional handling, start date format, due date format, valid calendar date, empty date handling, date field independence, whitespace-only title rejection}
  - [31] [TodoHistory Validation Rules](./04-business-rules.md#todohistory-validation-rules) — Define validation rules for TodoHistory, including boundary values and format requirements. {automatic history creation, edit timestamp format, changed fields only, title change recording, description change recording, start date change recording, due date change recording, unchanged field exclusion, manual entry prevention, timezone-aware timestamps}
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [32] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations. {filtering, sorting, pagination, cursor, query}
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [33] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language. {error-scenario, rejection, failure-case, exception}

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [34] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements. {performance, slo, latency, throughput, scalability}
  - [35] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements. {rate-limit, throttling, abuse-prevention, cooldown}
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [36] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance. {security, encryption, compliance, input-validation, owasp}
  - [37] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies. {availability, uptime, error-budget, reliability}
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [38] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements. {data-integrity, backup, retention, storage, consistency}
  - [39] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements. {audit, logging, monitoring, alerting, observability}
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [40] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations. {concurrency, locking, conflict-resolution, race-condition, retry-semantics}
  - [41] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees. {consistency, transaction-boundary, atomicity, idempotency}

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

- **User**: email: string, unique, required, password: string, required, displayName: string, required
- **Todo**: title: string, required, description: string, optional, startDate: date, optional, dueDate: date, optional, completed: boolean, default false, deletedAt: timestamp, optional for soft delete, createdAt: timestamp, required
- **TodoHistory**: editedAt: timestamp, required, newTitle: string, optional, newDescription: string, optional, newStartDate: date, optional, newDueDate: date, optional

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