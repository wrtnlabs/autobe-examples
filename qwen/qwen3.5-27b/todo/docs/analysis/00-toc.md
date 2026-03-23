### Table of Contents

**multiUserTodo** is a backend service with the following actors and domain entities.

**Actors**: guest, member
**Entities**: User, Todo, EditHistory

---

**Scope**

- **User**: email: unique identifier, password: secure credential, displayName: user's public name | Relationships: owns Todo items, owns EditHistory entries
- **Todo**: title: required task name, description: optional task details, startDate: optional start date, dueDate: optional due date, completed: completion status, deleted: soft delete flag | Relationships: owned by User, has EditHistory entries
- **EditHistory**: editTimestamp: when edit occurred, titleChange: new title if changed, descriptionChange: new description if changed, startDateChange: new start date if changed, dueDateChange: new due date if changed | Relationships: belongs to Todo, owned by User indirectly

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
| [04-business-rules.md](./04-business-rules.md) | Data isolation, business rules, data browsing expectations, error scenarios | service-layer |
| [05-non-functional.md](./05-non-functional.md) | Performance SLOs, security policies, data integrity, storage requirements | test-infra |

**Section Navigation**

<!-- Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })` -->

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [guest Actor](./01-actors-and-auth.md#guest-actor) — Define the guest actor's role and capabilities in business terms.
  - [2] [member Actor](./01-actors-and-auth.md#member-actor) — Define the member actor's role and capabilities in business terms.
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [3] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [4] [Session and Token Policy](./01-actors-and-auth.md#session-and-token-policy) — Define session duration, token refresh, and expiration policies.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [5] [Account States and Transitions](./01-actors-and-auth.md#account-states-and-transitions) — Define account states (active, suspended, deleted) and valid transitions.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [6] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain, its purpose, and how users interact with it.
  - [7] [Todo Concept](./02-domain-model.md#todo-concept) — Describe what Todo represents in the business domain, its purpose, and how users interact with it.
  - [8] [EditHistory Concept](./02-domain-model.md#edithistory-concept) — Describe what EditHistory represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [9] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [10] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [11] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [12] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [13] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [14] [Todo Operations](./03-functional-requirements.md#todo-operations) — Define business operations for Todo: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [15] [EditHistory Operations](./03-functional-requirements.md#edithistory-operations) — Define business operations for EditHistory: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [16] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective.
  - [17] [Todo Actions](./03-functional-requirements.md#todo-actions) — Define business actions and workflows for the Todo domain group from a functional requirements perspective.
  - [18] [EditHistory Actions](./03-functional-requirements.md#edithistory-actions) — Define business actions and workflows for the EditHistory domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [19] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [20] [Todo Error Scenarios](./03-functional-requirements.md#todo-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Todo operations.
  - [21] [EditHistory Error Scenarios](./03-functional-requirements.md#edithistory-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all EditHistory operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [22] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective.
  - [23] [Todo User Scenarios](./03-functional-requirements.md#todo-user-scenarios) — Define end-to-end user scenarios involving Todo and related concepts, describing business flows from the user's perspective.
  - [24] [EditHistory User Scenarios](./03-functional-requirements.md#edithistory-user-scenarios) — Define end-to-end user scenarios involving EditHistory and related concepts, describing business flows from the user's perspective.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [25] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [26] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User.
  - [27] [Todo Rules](./04-business-rules.md#todo-rules) — Define business rules, validation logic, and domain constraints for Todo.
  - [28] [EditHistory Rules](./04-business-rules.md#edithistory-rules) — Define business rules, validation logic, and domain constraints for EditHistory.
- [Business Validation Criteria](./04-business-rules.md#business-validation-criteria)
  - [29] [User Validation Criteria](./04-business-rules.md#user-validation-criteria) — Define business validation expectations for User, including acceptable data quality criteria.
  - [30] [Todo Validation Criteria](./04-business-rules.md#todo-validation-criteria) — Define business validation expectations for Todo, including acceptable data quality criteria.
  - [31] [EditHistory Validation Criteria](./04-business-rules.md#edithistory-validation-criteria) — Define business validation expectations for EditHistory, including acceptable data quality criteria.
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [32] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [33] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [34] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [35] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [36] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [37] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [38] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [39] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [40] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [41] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.

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

- **User**: email: unique identifier, password: secure credential, displayName: user's public name
- **Todo**: title: required task name, description: optional task details, startDate: optional start date, dueDate: optional due date, completed: completion status, deleted: soft delete flag
- **EditHistory**: editTimestamp: when edit occurred, titleChange: new title if changed, descriptionChange: new description if changed, startDateChange: new start date if changed, dueDateChange: new due date if changed

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