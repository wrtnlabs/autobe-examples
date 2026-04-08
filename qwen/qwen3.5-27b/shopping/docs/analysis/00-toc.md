### Table of Contents

**shoppingMall** is a backend service with the following actors and domain entities.

**Actors**: guest, customer, seller, administrator
**Entities**: Customer, Seller, Administrator, Address, Category, Product, ProductImage, ProductVariant, InventoryRecord, Wishlist, Cart, CartItem, Order, OrderItem, Shipment, Review, CancellationRequest, RefundRequest, Snapshot

---

**Scope**

- **Customer** — has Addresses, has Wishlist, has Cart, has Orders, has Reviews
- **Seller** — has Products, has OrderItems, has CancellationRequests, has RefundRequests
- **Administrator** — manages Sellers, manages Categories, manages Products, manages Orders, manages Users
- **Address** — belongs to Customer, used in Orders
- **Category** — has Subcategories, contains Products
- **Product** — owned by Seller, belongs to Category, has ProductVariants, has ProductImages, has ProductSnapshots, appears in Wishlists, appears in CartItems, appears in OrderItems, has Reviews
- **ProductImage** — belongs to Product
- **ProductVariant** — belongs to Product, has InventoryRecords, has VariantSnapshots, appears in CartItems, appears in OrderItems
- **InventoryRecord** — belongs to ProductVariant
- **Wishlist** — belongs to Customer, contains Products
- **Cart** — belongs to Customer, has CartItems
- **CartItem** — belongs to Cart, references ProductVariant
- **Order** — placed by Customer, has OrderItems, has Shipments
- **OrderItem** — belongs to Order, sold by Seller, has CancellationRequests, has RefundRequests, included in Shipments
- **Shipment** — belongs to Order, sent by Seller, contains OrderItems
- **Review** — written by Customer, for Product, for OrderItem, has ReviewSnapshots
- **CancellationRequest** — requested by Customer, for OrderItem, responded by Seller, has RequestSnapshots
- **RefundRequest** — requested by Customer, for OrderItem, responded by Seller, has RequestSnapshots
- **Snapshot** — captures state of Product, captures state of ProductVariant, captures state of SellerProfile, captures state of Review, captures state of CancellationRequest, captures state of RefundRequest

- **guest** (guest)
- **customer** (member)
- **seller** (member)
- **administrator** (admin)

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
  - [2] [customer Actor](./01-actors-and-auth.md#customer-actor) — Define the customer actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [3] [seller Actor](./01-actors-and-auth.md#seller-actor) — Define the seller actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [4] [administrator Actor](./01-actors-and-auth.md#administrator-actor) — Define the administrator actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [5] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [6] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [7] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [8] [Customer Concept](./02-domain-model.md#customer-concept) — Describe what Customer represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [Seller Concept](./02-domain-model.md#seller-concept) — Describe what Seller represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [Administrator Concept](./02-domain-model.md#administrator-concept) — Describe what Administrator represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Address Concept](./02-domain-model.md#address-concept) — Describe what Address represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Category Concept](./02-domain-model.md#category-concept) — Describe what Category represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [ProductImage Concept](./02-domain-model.md#productimage-concept) — Describe what ProductImage represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [ProductVariant Concept](./02-domain-model.md#productvariant-concept) — Describe what ProductVariant represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [InventoryRecord Concept](./02-domain-model.md#inventoryrecord-concept) — Describe what InventoryRecord represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Wishlist Concept](./02-domain-model.md#wishlist-concept) — Describe what Wishlist represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [Cart Concept](./02-domain-model.md#cart-concept) — Describe what Cart represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [CartItem Concept](./02-domain-model.md#cartitem-concept) — Describe what CartItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [Order Concept](./02-domain-model.md#order-concept) — Describe what Order represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [21] [OrderItem Concept](./02-domain-model.md#orderitem-concept) — Describe what OrderItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [22] [Shipment Concept](./02-domain-model.md#shipment-concept) — Describe what Shipment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [23] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [24] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [25] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [26] [Snapshot Concept](./02-domain-model.md#snapshot-concept) — Describe what Snapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
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
  - [33] [Administrator Operations](./03-functional-requirements.md#administrator-operations) — Define business operations for Administrator: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [34] [Address Operations](./03-functional-requirements.md#address-operations) — Define business operations for Address: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [35] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [ProductImage Operations](./03-functional-requirements.md#productimage-operations) — Define business operations for ProductImage: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [Wishlist Operations](./03-functional-requirements.md#wishlist-operations) — Define business operations for Wishlist: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [Cart Operations](./03-functional-requirements.md#cart-operations) — Define business operations for Cart: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [CartItem Operations](./03-functional-requirements.md#cartitem-operations) — Define business operations for CartItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [49] [Snapshot Operations](./03-functional-requirements.md#snapshot-operations) — Define business operations for Snapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [50] [Customer Error Scenarios](./03-functional-requirements.md#customer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Customer operations.
  - [51] [Seller Error Scenarios](./03-functional-requirements.md#seller-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Seller operations.
  - [52] [Administrator Error Scenarios](./03-functional-requirements.md#administrator-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Administrator operations.
  - [53] [Address Error Scenarios](./03-functional-requirements.md#address-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Address operations.
  - [54] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [55] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [56] [ProductImage Error Scenarios](./03-functional-requirements.md#productimage-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductImage operations.
  - [57] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [58] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [59] [Wishlist Error Scenarios](./03-functional-requirements.md#wishlist-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Wishlist operations.
  - [60] [Cart Error Scenarios](./03-functional-requirements.md#cart-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Cart operations.
  - [61] [CartItem Error Scenarios](./03-functional-requirements.md#cartitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CartItem operations.
  - [62] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [63] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItem operations.
  - [64] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [65] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [66] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [67] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequest operations.
  - [68] [Snapshot Error Scenarios](./03-functional-requirements.md#snapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Snapshot operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [69] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [70] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [71] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [72] [Customer Rules](./04-business-rules.md#customer-rules) — Define validation rules and domain constraints for Customer. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [73] [Seller Rules](./04-business-rules.md#seller-rules) — Define validation rules and domain constraints for Seller. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [74] [Administrator Rules](./04-business-rules.md#administrator-rules) — Define validation rules and domain constraints for Administrator. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [75] [Address Rules](./04-business-rules.md#address-rules) — Define validation rules and domain constraints for Address. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [76] [Category Rules](./04-business-rules.md#category-rules) — Define validation rules and domain constraints for Category. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [77] [Product Rules](./04-business-rules.md#product-rules) — Define validation rules and domain constraints for Product. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [78] [ProductImage Rules](./04-business-rules.md#productimage-rules) — Define validation rules and domain constraints for ProductImage. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [79] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define validation rules and domain constraints for ProductVariant. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [80] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define validation rules and domain constraints for InventoryRecord. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [81] [Wishlist Rules](./04-business-rules.md#wishlist-rules) — Define validation rules and domain constraints for Wishlist. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [82] [Cart Rules](./04-business-rules.md#cart-rules) — Define validation rules and domain constraints for Cart. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [83] [CartItem Rules](./04-business-rules.md#cartitem-rules) — Define validation rules and domain constraints for CartItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [84] [Order Rules](./04-business-rules.md#order-rules) — Define validation rules and domain constraints for Order. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [85] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define validation rules and domain constraints for OrderItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [86] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define validation rules and domain constraints for Shipment. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [87] [Review Rules](./04-business-rules.md#review-rules) — Define validation rules and domain constraints for Review. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [88] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define validation rules and domain constraints for CancellationRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [89] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define validation rules and domain constraints for RefundRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [90] [Snapshot Rules](./04-business-rules.md#snapshot-rules) — Define validation rules and domain constraints for Snapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [91] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [92] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [93] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [94] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [95] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [96] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [97] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [98] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **Customer** — has Addresses, has Wishlist, has Cart, has Orders, has Reviews
- **Seller** — has Products, has OrderItems, has CancellationRequests, has RefundRequests
- **Administrator** — manages Sellers, manages Categories, manages Products, manages Orders, manages Users
- **Address** — belongs to Customer, used in Orders
- **Category** — has Subcategories, contains Products
- **Product** — owned by Seller, belongs to Category, has ProductVariants, has ProductImages, has ProductSnapshots, appears in Wishlists, appears in CartItems, appears in OrderItems, has Reviews
- **ProductImage** — belongs to Product
- **ProductVariant** — belongs to Product, has InventoryRecords, has VariantSnapshots, appears in CartItems, appears in OrderItems
- **InventoryRecord** — belongs to ProductVariant
- **Wishlist** — belongs to Customer, contains Products
- **Cart** — belongs to Customer, has CartItems
- **CartItem** — belongs to Cart, references ProductVariant
- **Order** — placed by Customer, has OrderItems, has Shipments
- **OrderItem** — belongs to Order, sold by Seller, has CancellationRequests, has RefundRequests, included in Shipments
- **Shipment** — belongs to Order, sent by Seller, contains OrderItems
- **Review** — written by Customer, for Product, for OrderItem, has ReviewSnapshots
- **CancellationRequest** — requested by Customer, for OrderItem, responded by Seller, has RequestSnapshots
- **RefundRequest** — requested by Customer, for OrderItem, responded by Seller, has RequestSnapshots
- **Snapshot** — captures state of Product, captures state of ProductVariant, captures state of SellerProfile, captures state of Review, captures state of CancellationRequest, captures state of RefundRequest

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