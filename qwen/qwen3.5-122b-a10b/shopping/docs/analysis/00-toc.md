### Table of Contents

**ecommerceMall** is a backend service with the following actors and domain entities.

**Actors**: customer, seller, admin
**Entities**: Customer, Seller, Product, ProductVariant, Category, Order, OrderItem, Address, Review, Wishlist, CartItem, Shipment, Snapshot, InventoryRecord, CancellationRequest, RefundRequest

---

**Scope**

- **Customer**: email: string, required, unique, password: string, required, hashed, displayName: string, optional, phoneNumber: string, optional, accountStatus: enum(active, suspended, banned), required | Relationships: has many Addresses, has many Orders, has many Wishlist items, has many Reviews
- **Seller**: email: string, required, unique, password: string, required, hashed, shopName: string, required, shopDescription: text, optional, approvalStatus: enum(pending, approved, rejected), required, rejectionReason: text, optional | Relationships: has many Products, has many OrderItems, has many Snapshots
- **Product**: name: string, required, description: text, required, basePrice: decimal, required, status: enum(active, deleted, suspended), required, categoryId: reference, required | Relationships: belongs to Seller, belongs to Category, has many ProductVariants, has many ProductImages, has many Snapshots
- **ProductVariant**: skuCode: string, required, unique, optionValues: json, required, price: decimal, optional, stockQuantity: integer, required | Relationships: belongs to Product, has many InventoryRecords, has many OrderItems, has many Snapshots
- **Category**: name: string, required, description: text, optional, parentId: reference, optional | Relationships: has many Products, has many Subcategories
- **Order**: orderNumber: string, required, unique, orderDate: datetime, required, totalPrice: decimal, required, status: enum(paid, shipped, delivered, cancelled, refunded, partiallyCompleted), required | Relationships: belongs to Customer, has many OrderItems, has many Shipments, has one Address
- **OrderItem**: quantity: integer, required, unitPrice: decimal, required, status: enum(paid, shipped, delivered, cancelled, refunded), required, createdAt: datetime, required | Relationships: belongs to Order, belongs to ProductVariant, has one ProductSnapshot, has one SellerSnapshot
- **Address**: recipientName: string, required, phoneNumber: string, required, streetAddress: string, required, city: string, required, postalCode: string, required, country: string, required, isDefault: boolean, required | Relationships: belongs to Customer, used in many Orders
- **Review**: rating: integer(1-5), required, content: text, optional, createdAt: datetime, required, isDeleted: boolean, required | Relationships: belongs to Customer, belongs to Product, has many Snapshots
- **Wishlist**: createdAt: datetime, required, isActive: boolean, required, productId: reference, required | Relationships: belongs to Customer, references Product
- **CartItem**: quantity: integer, required, addedAt: datetime, required, updatedAt: datetime, required | Relationships: belongs to Customer, belongs to ProductVariant
- **Shipment**: trackingNumber: string, required, carrierName: string, required, shippedAt: datetime, required, deliveredAt: datetime, optional | Relationships: belongs to Seller, has many OrderItems
- **Snapshot**: snapshotType: enum(product, variant, seller, orderItem, review, cancellation, refund), required, createdAt: datetime, required, previousValues: json, required, currentValues: json, required, changedBy: reference, required | Relationships: belongs to various entities, immutable, cannot be deleted
- **InventoryRecord**: quantityChange: integer, required, reason: string, required, recordedAt: datetime, required, currentStock: integer, required | Relationships: belongs to ProductVariant
- **CancellationRequest**: reason: text, required, status: enum(pending, approved, rejected), required, requestedAt: datetime, required, respondedAt: datetime, optional | Relationships: belongs to OrderItem, has many Snapshots
- **RefundRequest**: reason: text, required, status: enum(pending, approved, rejected), required, requestedAt: datetime, required, respondedAt: datetime, optional, daysSinceDelivery: integer, required | Relationships: belongs to OrderItem, has many Snapshots

- **customer** (member)
- **seller** (member)
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
  - [1] [customer Actor](./01-actors-and-auth.md#customer-actor) — Define the customer actor's role and capabilities in business terms.
  - [2] [seller Actor](./01-actors-and-auth.md#seller-actor) — Define the seller actor's role and capabilities in business terms.
  - [3] [admin Actor](./01-actors-and-auth.md#admin-actor) — Define the admin actor's role and capabilities in business terms.
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [4] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [5] [Session and Token Policy](./01-actors-and-auth.md#session-and-token-policy) — Define session duration, token refresh, and expiration policies.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [6] [Account States and Transitions](./01-actors-and-auth.md#account-states-and-transitions) — Define account states (active, suspended, deleted) and valid transitions.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [7] [Customer Concept](./02-domain-model.md#customer-concept) — Describe what Customer represents in the business domain, its purpose, and how users interact with it.
  - [8] [Seller Concept](./02-domain-model.md#seller-concept) — Describe what Seller represents in the business domain, its purpose, and how users interact with it.
  - [9] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain, its purpose, and how users interact with it.
  - [10] [ProductVariant Concept](./02-domain-model.md#productvariant-concept) — Describe what ProductVariant represents in the business domain, its purpose, and how users interact with it.
  - [11] [Category Concept](./02-domain-model.md#category-concept) — Describe what Category represents in the business domain, its purpose, and how users interact with it.
  - [12] [Order Concept](./02-domain-model.md#order-concept) — Describe what Order represents in the business domain, its purpose, and how users interact with it.
  - [13] [OrderItem Concept](./02-domain-model.md#orderitem-concept) — Describe what OrderItem represents in the business domain, its purpose, and how users interact with it.
  - [14] [Address Concept](./02-domain-model.md#address-concept) — Describe what Address represents in the business domain, its purpose, and how users interact with it.
  - [15] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain, its purpose, and how users interact with it.
  - [16] [Wishlist Concept](./02-domain-model.md#wishlist-concept) — Describe what Wishlist represents in the business domain, its purpose, and how users interact with it.
  - [17] [CartItem Concept](./02-domain-model.md#cartitem-concept) — Describe what CartItem represents in the business domain, its purpose, and how users interact with it.
  - [18] [Shipment Concept](./02-domain-model.md#shipment-concept) — Describe what Shipment represents in the business domain, its purpose, and how users interact with it.
  - [19] [Snapshot Concept](./02-domain-model.md#snapshot-concept) — Describe what Snapshot represents in the business domain, its purpose, and how users interact with it.
  - [20] [InventoryRecord Concept](./02-domain-model.md#inventoryrecord-concept) — Describe what InventoryRecord represents in the business domain, its purpose, and how users interact with it.
  - [21] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain, its purpose, and how users interact with it.
  - [22] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain, its purpose, and how users interact with it.
  - [23] [Administrator Concept](./02-domain-model.md#administrator-concept) — Describe what Administrator represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [24] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [25] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Enums and State Machines](./02-domain-model.md#enums-and-state-machines)
  - [26] [Enum Definitions](./02-domain-model.md#enum-definitions) — Define all enum types with their allowed values and descriptions.
  - [27] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [28] [Customer Operations](./03-functional-requirements.md#customer-operations) — Define business operations for Customer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [Seller Operations](./03-functional-requirements.md#seller-operations) — Define business operations for Seller: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [31] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [32] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [33] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [34] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [35] [Address Operations](./03-functional-requirements.md#address-operations) — Define business operations for Address: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [Wishlist Operations](./03-functional-requirements.md#wishlist-operations) — Define business operations for Wishlist: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [CartItem Operations](./03-functional-requirements.md#cartitem-operations) — Define business operations for CartItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [Snapshot Operations](./03-functional-requirements.md#snapshot-operations) — Define business operations for Snapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [44] [Customer Actions](./03-functional-requirements.md#customer-actions) — Define business actions and workflows for the Customer domain group from a functional requirements perspective.
  - [45] [Seller Actions](./03-functional-requirements.md#seller-actions) — Define business actions and workflows for the Seller domain group from a functional requirements perspective.
  - [46] [Product Actions](./03-functional-requirements.md#product-actions) — Define business actions and workflows for the Product domain group from a functional requirements perspective.
  - [47] [ProductVariant Actions](./03-functional-requirements.md#productvariant-actions) — Define business actions and workflows for the ProductVariant domain group from a functional requirements perspective.
  - [48] [Category Actions](./03-functional-requirements.md#category-actions) — Define business actions and workflows for the Category domain group from a functional requirements perspective.
  - [49] [Order Actions](./03-functional-requirements.md#order-actions) — Define business actions and workflows for the Order domain group from a functional requirements perspective.
  - [50] [OrderItem Actions](./03-functional-requirements.md#orderitem-actions) — Define business actions and workflows for the OrderItem domain group from a functional requirements perspective.
  - [51] [Address Actions](./03-functional-requirements.md#address-actions) — Define business actions and workflows for the Address domain group from a functional requirements perspective.
  - [52] [Review Actions](./03-functional-requirements.md#review-actions) — Define business actions and workflows for the Review domain group from a functional requirements perspective.
  - [53] [Wishlist Actions](./03-functional-requirements.md#wishlist-actions) — Define business actions and workflows for the Wishlist domain group from a functional requirements perspective.
  - [54] [CartItem Actions](./03-functional-requirements.md#cartitem-actions) — Define business actions and workflows for the CartItem domain group from a functional requirements perspective.
  - [55] [Shipment Actions](./03-functional-requirements.md#shipment-actions) — Define business actions and workflows for the Shipment domain group from a functional requirements perspective.
  - [56] [Snapshot Actions](./03-functional-requirements.md#snapshot-actions) — Define business actions and workflows for the Snapshot domain group from a functional requirements perspective.
  - [57] [InventoryRecord Actions](./03-functional-requirements.md#inventoryrecord-actions) — Define business actions and workflows for the InventoryRecord domain group from a functional requirements perspective.
  - [58] [CancellationRequest Actions](./03-functional-requirements.md#cancellationrequest-actions) — Define business actions and workflows for the CancellationRequest domain group from a functional requirements perspective.
  - [59] [RefundRequest Actions](./03-functional-requirements.md#refundrequest-actions) — Define business actions and workflows for the RefundRequest domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [60] [Customer Error Scenarios](./03-functional-requirements.md#customer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Customer operations.
  - [61] [Seller Error Scenarios](./03-functional-requirements.md#seller-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Seller operations.
  - [62] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [63] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [64] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [65] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [66] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItem operations.
  - [67] [Address Error Scenarios](./03-functional-requirements.md#address-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Address operations.
  - [68] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [69] [Wishlist Error Scenarios](./03-functional-requirements.md#wishlist-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Wishlist operations.
  - [70] [CartItem Error Scenarios](./03-functional-requirements.md#cartitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CartItem operations.
  - [71] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [72] [Snapshot Error Scenarios](./03-functional-requirements.md#snapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Snapshot operations.
  - [73] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [74] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [75] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequest operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [76] [Customer User Scenarios](./03-functional-requirements.md#customer-user-scenarios) — Define end-to-end user scenarios involving Customer and related concepts, describing business flows from the user's perspective.
  - [77] [Seller User Scenarios](./03-functional-requirements.md#seller-user-scenarios) — Define end-to-end user scenarios involving Seller and related concepts, describing business flows from the user's perspective.
  - [78] [Product User Scenarios](./03-functional-requirements.md#product-user-scenarios) — Define end-to-end user scenarios involving Product and related concepts, describing business flows from the user's perspective.
  - [79] [ProductVariant User Scenarios](./03-functional-requirements.md#productvariant-user-scenarios) — Define end-to-end user scenarios involving ProductVariant and related concepts, describing business flows from the user's perspective.
  - [80] [Category User Scenarios](./03-functional-requirements.md#category-user-scenarios) — Define end-to-end user scenarios involving Category and related concepts, describing business flows from the user's perspective.
  - [81] [Order User Scenarios](./03-functional-requirements.md#order-user-scenarios) — Define end-to-end user scenarios involving Order and related concepts, describing business flows from the user's perspective.
  - [82] [OrderItem User Scenarios](./03-functional-requirements.md#orderitem-user-scenarios) — Define end-to-end user scenarios involving OrderItem and related concepts, describing business flows from the user's perspective.
  - [83] [Address User Scenarios](./03-functional-requirements.md#address-user-scenarios) — Define end-to-end user scenarios involving Address and related concepts, describing business flows from the user's perspective.
  - [84] [Review User Scenarios](./03-functional-requirements.md#review-user-scenarios) — Define end-to-end user scenarios involving Review and related concepts, describing business flows from the user's perspective.
  - [85] [Wishlist User Scenarios](./03-functional-requirements.md#wishlist-user-scenarios) — Define end-to-end user scenarios involving Wishlist and related concepts, describing business flows from the user's perspective.
  - [86] [CartItem User Scenarios](./03-functional-requirements.md#cartitem-user-scenarios) — Define end-to-end user scenarios involving CartItem and related concepts, describing business flows from the user's perspective.
  - [87] [Shipment User Scenarios](./03-functional-requirements.md#shipment-user-scenarios) — Define end-to-end user scenarios involving Shipment and related concepts, describing business flows from the user's perspective.
  - [88] [Snapshot User Scenarios](./03-functional-requirements.md#snapshot-user-scenarios) — Define end-to-end user scenarios involving Snapshot and related concepts, describing business flows from the user's perspective.
  - [89] [InventoryRecord User Scenarios](./03-functional-requirements.md#inventoryrecord-user-scenarios) — Define end-to-end user scenarios involving InventoryRecord and related concepts, describing business flows from the user's perspective.
  - [90] [CancellationRequest User Scenarios](./03-functional-requirements.md#cancellationrequest-user-scenarios) — Define end-to-end user scenarios involving CancellationRequest and related concepts, describing business flows from the user's perspective.
  - [91] [RefundRequest User Scenarios](./03-functional-requirements.md#refundrequest-user-scenarios) — Define end-to-end user scenarios involving RefundRequest and related concepts, describing business flows from the user's perspective.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [92] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [93] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.
- [Background Processing](./03-functional-requirements.md#background-processing)
  - [94] [Job Specifications](./03-functional-requirements.md#job-specifications) — Define background jobs, queue configurations, retry policies, and scheduling rules for asynchronous processing.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [95] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [96] [Customer Rules](./04-business-rules.md#customer-rules) — Define business rules, validation logic, and domain constraints for Customer.
  - [97] [Seller Rules](./04-business-rules.md#seller-rules) — Define business rules, validation logic, and domain constraints for Seller.
  - [98] [Product Rules](./04-business-rules.md#product-rules) — Define business rules, validation logic, and domain constraints for Product.
  - [99] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define business rules, validation logic, and domain constraints for ProductVariant.
  - [100] [Category Rules](./04-business-rules.md#category-rules) — Define business rules, validation logic, and domain constraints for Category.
  - [101] [Order Rules](./04-business-rules.md#order-rules) — Define business rules, validation logic, and domain constraints for Order.
  - [102] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define business rules, validation logic, and domain constraints for OrderItem.
  - [103] [Address Rules](./04-business-rules.md#address-rules) — Define business rules, validation logic, and domain constraints for Address.
  - [104] [Review Rules](./04-business-rules.md#review-rules) — Define business rules, validation logic, and domain constraints for Review.
  - [105] [Wishlist Rules](./04-business-rules.md#wishlist-rules) — Define business rules, validation logic, and domain constraints for Wishlist.
  - [106] [CartItem Rules](./04-business-rules.md#cartitem-rules) — Define business rules, validation logic, and domain constraints for CartItem.
  - [107] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define business rules, validation logic, and domain constraints for Shipment.
  - [108] [Snapshot Rules](./04-business-rules.md#snapshot-rules) — Define business rules, validation logic, and domain constraints for Snapshot.
  - [109] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define business rules, validation logic, and domain constraints for InventoryRecord.
  - [110] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define business rules, validation logic, and domain constraints for CancellationRequest.
  - [111] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define business rules, validation logic, and domain constraints for RefundRequest.
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [112] [Customer Validation Rules](./04-business-rules.md#customer-validation-rules) — Define validation rules for Customer, including boundary values and format requirements.
  - [113] [Seller Validation Rules](./04-business-rules.md#seller-validation-rules) — Define validation rules for Seller, including boundary values and format requirements.
  - [114] [Product Validation Rules](./04-business-rules.md#product-validation-rules) — Define validation rules for Product, including boundary values and format requirements.
  - [115] [ProductVariant Validation Rules](./04-business-rules.md#productvariant-validation-rules) — Define validation rules for ProductVariant, including boundary values and format requirements.
  - [116] [Category Validation Rules](./04-business-rules.md#category-validation-rules) — Define validation rules for Category, including boundary values and format requirements.
  - [117] [Order Validation Rules](./04-business-rules.md#order-validation-rules) — Define validation rules for Order, including boundary values and format requirements.
  - [118] [OrderItem Validation Rules](./04-business-rules.md#orderitem-validation-rules) — Define validation rules for OrderItem, including boundary values and format requirements.
  - [119] [Address Validation Rules](./04-business-rules.md#address-validation-rules) — Define validation rules for Address, including boundary values and format requirements.
  - [120] [Review Validation Rules](./04-business-rules.md#review-validation-rules) — Define validation rules for Review, including boundary values and format requirements.
  - [121] [Wishlist Validation Rules](./04-business-rules.md#wishlist-validation-rules) — Define validation rules for Wishlist, including boundary values and format requirements.
  - [122] [CartItem Validation Rules](./04-business-rules.md#cartitem-validation-rules) — Define validation rules for CartItem, including boundary values and format requirements.
  - [123] [Shipment Validation Rules](./04-business-rules.md#shipment-validation-rules) — Define validation rules for Shipment, including boundary values and format requirements.
  - [124] [Snapshot Validation Rules](./04-business-rules.md#snapshot-validation-rules) — Define validation rules for Snapshot, including boundary values and format requirements.
  - [125] [InventoryRecord Validation Rules](./04-business-rules.md#inventoryrecord-validation-rules) — Define validation rules for InventoryRecord, including boundary values and format requirements.
  - [126] [CancellationRequest Validation Rules](./04-business-rules.md#cancellationrequest-validation-rules) — Define validation rules for CancellationRequest, including boundary values and format requirements.
  - [127] [RefundRequest Validation Rules](./04-business-rules.md#refundrequest-validation-rules) — Define validation rules for RefundRequest, including boundary values and format requirements.
  - [128] [File Validation Rules](./04-business-rules.md#file-validation-rules) — Define validation rules for file uploads and storage policies.
  - [129] [Integration Error Handling](./04-business-rules.md#integration-error-handling) — Define validation rules for external integration error handling.
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [130] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [131] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules-1)
  - [132] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling-1)
  - [133] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.
- [Job Failure Policies](./04-business-rules.md#job-failure-policies)
  - [134] [Job Failure and Recovery](./04-business-rules.md#job-failure-and-recovery) — Define failure handling, recovery procedures, and notification requirements for background jobs.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [135] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [136] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [137] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [138] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [139] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [140] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [141] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [142] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [143] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [144] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.
- [Queue Performance](./05-non-functional.md#queue-performance)
  - [145] [Queue Performance SLOs](./05-non-functional.md#queue-performance-slos) — Define performance requirements for background job processing.

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

- **Customer**: email: string, required, unique, password: string, required, hashed, displayName: string, optional, phoneNumber: string, optional, accountStatus: enum(active, suspended, banned), required
- **Seller**: email: string, required, unique, password: string, required, hashed, shopName: string, required, shopDescription: text, optional, approvalStatus: enum(pending, approved, rejected), required, rejectionReason: text, optional
- **Product**: name: string, required, description: text, required, basePrice: decimal, required, status: enum(active, deleted, suspended), required, categoryId: reference, required
- **ProductVariant**: skuCode: string, required, unique, optionValues: json, required, price: decimal, optional, stockQuantity: integer, required
- **Category**: name: string, required, description: text, optional, parentId: reference, optional
- **Order**: orderNumber: string, required, unique, orderDate: datetime, required, totalPrice: decimal, required, status: enum(paid, shipped, delivered, cancelled, refunded, partiallyCompleted), required
- **OrderItem**: quantity: integer, required, unitPrice: decimal, required, status: enum(paid, shipped, delivered, cancelled, refunded), required, createdAt: datetime, required
- **Address**: recipientName: string, required, phoneNumber: string, required, streetAddress: string, required, city: string, required, postalCode: string, required, country: string, required, isDefault: boolean, required
- **Review**: rating: integer(1-5), required, content: text, optional, createdAt: datetime, required, isDeleted: boolean, required
- **Wishlist**: createdAt: datetime, required, isActive: boolean, required, productId: reference, required
- **CartItem**: quantity: integer, required, addedAt: datetime, required, updatedAt: datetime, required
- **Shipment**: trackingNumber: string, required, carrierName: string, required, shippedAt: datetime, required, deliveredAt: datetime, optional
- **Snapshot**: snapshotType: enum(product, variant, seller, orderItem, review, cancellation, refund), required, createdAt: datetime, required, previousValues: json, required, currentValues: json, required, changedBy: reference, required
- **InventoryRecord**: quantityChange: integer, required, reason: string, required, recordedAt: datetime, required, currentStock: integer, required
- **CancellationRequest**: reason: text, required, status: enum(pending, approved, rejected), required, requestedAt: datetime, required, respondedAt: datetime, optional
- **RefundRequest**: reason: text, required, status: enum(pending, approved, rejected), required, requestedAt: datetime, required, respondedAt: datetime, optional, daysSinceDelivery: integer, required

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
- external-integration
- background-processing