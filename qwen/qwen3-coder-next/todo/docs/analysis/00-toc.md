### Table of Contents

**todoApp** is a backend service with the following actors and domain entities.

**Actors**: guest, member, admin
**Entities**: User, Profile, Todo, EditHistory

---

**Scope**

- **User**: email: text(required, unique), password: hash(required), createdAt: datetime, updatedAt: datetime | Relationships: hasOne Profile, hasMany Todos, canDeleteOwnAccount(cascades to todos)
- **Profile**: displayName: text(1-100), userId: reference to User | Relationships: belongsTo User
- **Todo**: title: text(1-500, required), description: text(optional), startDate: datetime(optional), dueDate: datetime(optional), isComplete: boolean(default false), isDeleted: boolean(default false), createdAt: datetime, updatedAt: datetime | Relationships: belongsTo User, hasMany EditHistory, supports filtering by completion status, supports sorting by creation/start/due dates
- **EditHistory**: editedAt: datetime, previousTitle: text, newTitle: text, previousDescription: text, newDescription: text, previousStartDate: datetime, newStartDate: datetime, previousDueDate: datetime, newDueDate: datetime | Relationships: belongsTo Todo

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
  - [9] [Todo Concept](./02-domain-model.md#todo-concept) — Describe what Todo represents in the business domain, its purpose, and how users interact with it.
  - [10] [EditHistory Concept](./02-domain-model.md#edithistory-concept) — Describe what EditHistory represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [11] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [12] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Enums and State Machines](./02-domain-model.md#enums-and-state-machines)
  - [13] [Enum Definitions](./02-domain-model.md#enum-definitions) — Define all enum types with their allowed values and descriptions.
  - [14] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [15] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [16] [Profile Operations](./03-functional-requirements.md#profile-operations) — Define business operations for Profile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [17] [Todo Operations](./03-functional-requirements.md#todo-operations) — Define business operations for Todo: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [18] [EditHistory Operations](./03-functional-requirements.md#edithistory-operations) — Define business operations for EditHistory: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [19] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective.
  - [20] [Profile Actions](./03-functional-requirements.md#profile-actions) — Define business actions and workflows for the Profile domain group from a functional requirements perspective.
  - [21] [Todo Actions](./03-functional-requirements.md#todo-actions) — Define business actions and workflows for the Todo domain group from a functional requirements perspective.
  - [22] [EditHistory Actions](./03-functional-requirements.md#edithistory-actions) — Define business actions and workflows for the EditHistory domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [23] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [24] [Profile Error Scenarios](./03-functional-requirements.md#profile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Profile operations.
  - [25] [Todo Error Scenarios](./03-functional-requirements.md#todo-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Todo operations.
  - [26] [EditHistory Error Scenarios](./03-functional-requirements.md#edithistory-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all EditHistory operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [27] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective.
  - [28] [Profile User Scenarios](./03-functional-requirements.md#profile-user-scenarios) — Define end-to-end user scenarios involving Profile and related concepts, describing business flows from the user's perspective.
  - [29] [Todo User Scenarios](./03-functional-requirements.md#todo-user-scenarios) — Define end-to-end user scenarios involving Todo and related concepts, describing business flows from the user's perspective.
  - [30] [EditHistory User Scenarios](./03-functional-requirements.md#edithistory-user-scenarios) — Define end-to-end user scenarios involving EditHistory and related concepts, describing business flows from the user's perspective.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [31] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [32] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User.
  - [33] [Profile Rules](./04-business-rules.md#profile-rules) — Define business rules, validation logic, and domain constraints for Profile.
  - [34] [Todo Rules](./04-business-rules.md#todo-rules) — Define business rules, validation logic, and domain constraints for Todo.
  - [35] [EditHistory Rules](./04-business-rules.md#edithistory-rules) — Define business rules, validation logic, and domain constraints for EditHistory.
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [36] [User Validation Rules](./04-business-rules.md#user-validation-rules) — Define validation rules for User, including boundary values and format requirements.
  - [37] [Profile Validation Rules](./04-business-rules.md#profile-validation-rules) — Define validation rules for Profile, including boundary values and format requirements.
  - [38] [Todo Validation Rules](./04-business-rules.md#todo-validation-rules) — Define validation rules for Todo, including boundary values and format requirements.
  - [39] [EditHistory Validation Rules](./04-business-rules.md#edithistory-validation-rules) — Define validation rules for EditHistory, including boundary values and format requirements.
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [40] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [41] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [42] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [43] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [44] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [45] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [46] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [47] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [48] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [49] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.

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

- **User**: email: text(required, unique), password: hash(required), createdAt: datetime, updatedAt: datetime
- **Profile**: displayName: text(1-100), userId: reference to User
- **Todo**: title: text(1-500, required), description: text(optional), startDate: datetime(optional), dueDate: datetime(optional), isComplete: boolean(default false), isDeleted: boolean(default false), createdAt: datetime, updatedAt: datetime
- **EditHistory**: editedAt: datetime, previousTitle: text, newTitle: text, previousDescription: text, newDescription: text, previousStartDate: datetime, newStartDate: datetime, previousDueDate: datetime, newDueDate: datetime

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