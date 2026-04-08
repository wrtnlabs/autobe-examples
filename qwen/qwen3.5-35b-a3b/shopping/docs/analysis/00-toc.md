### Table of Contents

**ecommerceMall** is a backend service with the following actors and domain entities.

**Actors**: guest, member, seller, administrator, superAdministrator
**Entities**: Customer, Seller, Product, ProductVariant, Category, Order, OrderItem, Shipment, Address, Review, Wishlist, Snapshot, InventoryRecord, CancellationRequest, RefundRequest, Administrator, SuperAdministrator, SellerApprovalRequest

---

**Scope**

- **Customer** — owns Addresses, owns Wishlist, places Orders, writes Reviews
- **Seller** — owns Products, fulfills OrderItems, has SellerApprovalRequest
- **Product** — owned by Seller, belongs to Category, has ProductVariants, has Snapshots, appears in Reviews, appears in Wishlist
- **ProductVariant** — belongs to Product, has InventoryRecords, appears in OrderItems, appears in ProductSnapshots
- **Category** — contains Products, can have subcategory as parent
- **Order** — placed by Customer, contains OrderItems, has Shipments
- **OrderItem** — belongs to Order, purchases ProductVariant, has Snapshots, can be part of CancellationRequest, can be part of RefundRequest, grouped into Shipments
- **Shipment** — contains OrderItems, ships from Seller
- **Address** — owned by Customer, used by Order
- **Review** — belongs to Product, wrote by Customer, requires delivered OrderItem, has Snapshots
- **Wishlist** — owned by Customer, contains Product
- **Snapshot** — captures Product, captures ProductVariant, captures Seller, captures OrderItem, captures Review, captures CancellationRequest, captures RefundRequest
- **InventoryRecord** — tracks ProductVariant, records StockChanges
- **CancellationRequest** — applies to OrderItem, has Snapshots
- **RefundRequest** — applies to OrderItem, has Snapshots
- **Administrator** — manages Sellers, manages Categories, manages Products, manages Users, manages Orders
- **SuperAdministrator** — manages Administrators, manages Sellers, manages Categories, manages Products, manages Users, manages Orders
- **SellerApprovalRequest** — requested by Seller, reviewed by Administrator

- **guest** (guest)
- **member** (member)
- **seller** (member)
- **administrator** (admin)
- **superAdministrator** (admin)

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
  - [3] [seller Actor](./01-actors-and-auth.md#seller-actor) — Define the seller actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [4] [administrator Actor](./01-actors-and-auth.md#administrator-actor) — Define the administrator actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [5] [superAdministrator Actor](./01-actors-and-auth.md#superadministrator-actor) — Define the superAdministrator actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [6] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [7] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [8] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [9] [Customer Concept](./02-domain-model.md#customer-concept) — Describe what Customer represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [Seller Concept](./02-domain-model.md#seller-concept) — Describe what Seller represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [ProductVariant Concept](./02-domain-model.md#productvariant-concept) — Describe what ProductVariant represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [Category Concept](./02-domain-model.md#category-concept) — Describe what Category represents in the business domain and its key attributes. Do NOT describe operations and workflows — those belong in 03-functional-requirements.
  - [14] [Order Concept](./02-domain-model.md#order-concept) — Describe what Order represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [OrderItem Concept](./02-domain-model.md#orderitem-concept) — Describe what OrderItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [Shipment Concept](./02-domain-model.md#shipment-concept) — Describe what Shipment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Address Concept](./02-domain-model.md#address-concept) — Describe what Address represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [Wishlist Concept](./02-domain-model.md#wishlist-concept) — Describe what Wishlist represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [Snapshot Concept](./02-domain-model.md#snapshot-concept) — Describe what Snapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [21] [InventoryRecord Concept](./02-domain-model.md#inventoryrecord-concept) — Describe what InventoryRecord represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [22] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [23] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [24] [Administrator Concept](./02-domain-model.md#administrator-concept) — Describe what Administrator represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [25] [SuperAdministrator Concept](./02-domain-model.md#superadministrator-concept) — Describe what SuperAdministrator represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [26] [SellerApprovalRequest Concept](./02-domain-model.md#sellerapprovalrequest-concept) — Describe what SellerApprovalRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [27] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [28] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [29] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [30] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [31] [Customer Operations](./03-functional-requirements.md#customer-operations) — Define business operations for Customer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [32] [Seller Operations](./03-functional-requirements.md#seller-operations) — Define business operations for Seller: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [33] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [34] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [35] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [Address Operations](./03-functional-requirements.md#address-operations) — Define business operations for Address: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [Wishlist Operations](./03-functional-requirements.md#wishlist-operations) — Define business operations for Wishlist: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [Snapshot Operations](./03-functional-requirements.md#snapshot-operations) — Define business operations for Snapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [Administrator Operations](./03-functional-requirements.md#administrator-operations) — Define business operations for Administrator: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [SuperAdministrator Operations](./03-functional-requirements.md#superadministrator-operations) — Define business operations for SuperAdministrator: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [SellerApprovalRequest Operations](./03-functional-requirements.md#sellerapprovalrequest-operations) — Define business operations for SellerApprovalRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [49] [Customer Error Scenarios](./03-functional-requirements.md#customer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Customer operations.
  - [50] [Seller Error Scenarios](./03-functional-requirements.md#seller-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Seller operations.
  - [51] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [52] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [53] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [54] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [55] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItem operations.
  - [56] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [57] [Address Error Scenarios](./03-functional-requirements.md#address-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Address operations.
  - [58] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [59] [Wishlist Error Scenarios](./03-functional-requirements.md#wishlist-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Wishlist operations.
  - [60] [Snapshot Error Scenarios](./03-functional-requirements.md#snapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Snapshot operations.
  - [61] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [62] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [63] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, and expected system behaviors for all RefundRequest operations.
  - [64] [Administrator Error Scenarios](./03-functional-requirements.md#administrator-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Administrator operations.
  - [65] [SuperAdministrator Error Scenarios](./03-functional-requirements.md#superadministrator-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SuperAdministrator operations.
  - [66] [SellerApprovalRequest Error Scenarios](./03-functional-requirements.md#sellerapprovalrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerApprovalRequest operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [67] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [68] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [69] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [70] [Customer Rules](./04-business-rules.md#customer-rules) — Define validation rules and domain constraints for Customer.
  - [71] [Seller Rules](./04-business-rules.md#seller-rules) — Define validation rules and domain constraints for Seller.
  - [72] [Product Rules](./04-business-rules.md#product-rules) — Define validation rules and domain constraints for Product.
  - [73] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define validation rules and domain constraints for ProductVariant.
  - [74] [Category Rules](./04-business-rules.md#category-rules) — Define validation rules and domain constraints for Category.
  - [75] [Order Rules](./04-business-rules.md#order-rules) — Define validation rules and domain constraints for Order.
  - [76] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define validation rules and domain constraints for OrderItem.
  - [77] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define validation rules and domain constraints for Shipment.
  - [78] [Address Rules](./04-business-rules.md#address-rules) — Define validation rules and domain constraints for Address.
  - [79] [Review Rules](./04-business-rules.md#review-rules) — Define validation rules and domain constraints for Review.
  - [80] [Wishlist Rules](./04-business-rules.md#wishlist-rules) — Define validation rules and domain constraints for Wishlist.
  - [81] [Snapshot Rules](./04-business-rules.md#snapshot-rules) — Define validation rules and domain constraints for Snapshot.
  - [82] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define validation rules and domain constraints for InventoryRecord.
  - [83] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define validation rules and domain constraints for CancellationRequest.
  - [84] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define validation rules and domain constraints for RefundRequest.
  - [85] [Administrator Rules](./04-business-rules.md#administrator-rules) — Define validation rules and domain constraints for Administrator.
  - [86] [SuperAdministrator Rules](./04-business-rules.md#superadministrator-rules) — Define validation rules and domain constraints for SuperAdministrator.
  - [87] [SellerApprovalRequest Rules](./04-business-rules.md#sellerapprovalrequest-rules) — Define validation rules and domain constraints for SellerApprovalRequest.
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [88] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [89] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [90] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [91] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [92] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [93] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [94] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [95] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **Customer** — owns Addresses, owns Wishlist, places Orders, writes Reviews
- **Seller** — owns Products, fulfills OrderItems, has SellerApprovalRequest
- **Product** — owned by Seller, belongs to Category, has ProductVariants, has Snapshots, appears in Reviews, appears in Wishlist
- **ProductVariant** — belongs to Product, has InventoryRecords, appears in OrderItems, appears in ProductSnapshots
- **Category** — contains Products, can have subcategory as parent
- **Order** — placed by Customer, contains OrderItems, has Shipments
- **OrderItem** — belongs to Order, purchases ProductVariant, has Snapshots, can be part of CancellationRequest, can be part of RefundRequest, grouped into Shipments
- **Shipment** — contains OrderItems, ships from Seller
- **Address** — owned by Customer, used by Order
- **Review** — belongs to Product, wrote by Customer, requires delivered OrderItem, has Snapshots
- **Wishlist** — owned by Customer, contains Product
- **Snapshot** — captures Product, captures ProductVariant, captures Seller, captures OrderItem, captures Review, captures CancellationRequest, captures RefundRequest
- **InventoryRecord** — tracks ProductVariant, records StockChanges
- **CancellationRequest** — applies to OrderItem, has Snapshots
- **RefundRequest** — applies to OrderItem, has Snapshots
- **Administrator** — manages Sellers, manages Categories, manages Products, manages Users, manages Orders
- **SuperAdministrator** — manages Administrators, manages Sellers, manages Categories, manages Products, manages Users, manages Orders
- **SellerApprovalRequest** — requested by Seller, reviewed by Administrator

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

- external-integration
- file-storage