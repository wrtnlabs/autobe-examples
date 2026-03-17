### Table of Contents

**ecommerceMall** is a backend service with the following actors and domain entities.

**Actors**: guest, customer, seller, admin, superAdmin
**Entities**: Customer, CustomerProfile, Seller, SellerProfile, SellerRegistration, Administrator, AdminPromotionRequest, Category, Product, ProductVariant, ProductImage, InventoryRecord, WishlistItem, CartItem, Order, OrderItem, Shipment, CancellationRequest, RefundRequest, Review, Address, Snapshot

---

**Scope**

- **Customer** — hasOne CustomerProfile, hasMany Address, hasMany WishlistItem, hasMany CartItem, hasMany Order, hasMany Review, hasMany AdminPromotionRequest
- **CustomerProfile** — belongsTo Customer via customerId
- **Seller** — hasOne SellerProfile, hasMany Product, hasMany Shipment, hasMany OrderItem through Product, hasMany SellerRegistration, hasMany AdminPromotionRequest
- **SellerProfile** — belongsTo Seller via sellerId
- **SellerRegistration** — belongsTo Seller via sellerId
- **Administrator** — belongsTo Customer or Seller via userId, hasMany AdminPromotionRequest as reviewer
- **AdminPromotionRequest** — belongsTo Customer or Seller via requesterId, belongsTo Administrator via reviewerId
- **Category** — hasMany Category as subcategories via parentId, belongsTo Category as parent via parentId, hasMany Product
- **Product** — belongsTo Category via categoryId, belongsTo Seller via sellerId, hasMany ProductVariant, hasMany ProductImage, hasMany WishlistItem, hasMany CartItem, hasMany OrderItem, hasMany Review, hasMany ProductSnapshot
- **ProductVariant** — belongsTo Product via productId, hasMany CartItem, hasMany OrderItem, hasMany InventoryRecord, hasMany ProductVariantSnapshot
- **ProductImage** — belongsTo Product via productId
- **InventoryRecord** — belongsTo ProductVariant via variantId
- **WishlistItem** — belongsTo Customer via customerId, belongsTo Product via productId
- **CartItem** — belongsTo Customer via customerId, belongsTo ProductVariant via variantId
- **Order** — belongsTo Customer via customerId, hasMany OrderItem, hasMany Shipment
- **OrderItem** — belongsTo Order via orderId, belongsTo Product via productId, belongsTo ProductVariant via variantId, belongsTo Seller via sellerId, hasOne ProductSnapshot, hasOne ProductVariantSnapshot, hasOne SellerProfileSnapshot, hasMany CancellationRequest, hasMany RefundRequest
- **Shipment** — belongsTo Seller via sellerId, belongsTo Order via orderId, hasMany OrderItem
- **CancellationRequest** — belongsTo OrderItem via orderItemId, hasMany CancellationRequestSnapshot
- **RefundRequest** — belongsTo OrderItem via orderItemId, hasMany RefundRequestSnapshot
- **Review** — belongsTo Customer via customerId, belongsTo Product via productId, belongsTo Order via orderId, hasMany ReviewSnapshot
- **Address** — belongsTo Customer via customerId
- **Snapshot** — polymorphic - belongs to various entities

- **guest** (guest)
- **customer** (member)
- **seller** (member)
- **admin** (admin)
- **superAdmin** (admin)

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
  - [4] [admin Actor](./01-actors-and-auth.md#admin-actor) — Define the admin actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [5] [superAdmin Actor](./01-actors-and-auth.md#superadmin-actor) — Define the superAdmin actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [6] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [7] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [8] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [9] [Customer Concept](./02-domain-model.md#customer-concept) — Describe what Customer represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [CustomerProfile Concept](./02-domain-model.md#customerprofile-concept) — Describe what CustomerProfile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Seller Concept](./02-domain-model.md#seller-concept) — Describe what Seller represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [SellerProfile Concept](./02-domain-model.md#sellerprofile-concept) — Describe what SellerProfile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [SellerRegistration Concept](./02-domain-model.md#sellerregistration-concept) — Describe what SellerRegistration represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [Administrator Concept](./02-domain-model.md#administrator-concept) — Describe what Administrator represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [AdminPromotionRequest Concept](./02-domain-model.md#adminpromotionrequest-concept) — Describe what AdminPromotionRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [Category Concept](./02-domain-model.md#category-concept) — Describe what Category represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [ProductVariant Concept](./02-domain-model.md#productvariant-concept) — Describe what ProductVariant represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [ProductImage Concept](./02-domain-model.md#productimage-concept) — Describe what ProductImage represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [InventoryRecord Concept](./02-domain-model.md#inventoryrecord-concept) — Describe what InventoryRecord represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [21] [WishlistItem Concept](./02-domain-model.md#wishlistitem-concept) — Describe what WishlistItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [22] [CartItem Concept](./02-domain-model.md#cartitem-concept) — Describe what CartItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [23] [Order Concept](./02-domain-model.md#order-concept) — Describe what Order represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [24] [OrderItem Concept](./02-domain-model.md#orderitem-concept) — Describe what OrderItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [25] [Shipment Concept](./02-domain-model.md#shipment-concept) — Describe what Shipment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [26] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [27] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [28] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [29] [Address Concept](./02-domain-model.md#address-concept) — Describe what Address represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [30] [Snapshot Concept](./02-domain-model.md#snapshot-concept) — Describe what Snapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [31] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [32] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [33] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [34] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [35] [Customer Operations](./03-functional-requirements.md#customer-operations) — Define business operations for Customer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [CustomerProfile Operations](./03-functional-requirements.md#customerprofile-operations) — Define business operations for CustomerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [Seller Operations](./03-functional-requirements.md#seller-operations) — Define business operations for Seller: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [SellerProfile Operations](./03-functional-requirements.md#sellerprofile-operations) — Define business operations for SellerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [SellerRegistration Operations](./03-functional-requirements.md#sellerregistration-operations) — Define business operations for SellerRegistration: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [Administrator Operations](./03-functional-requirements.md#administrator-operations) — Define business operations for Administrator: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [AdminPromotionRequest Operations](./03-functional-requirements.md#adminpromotionrequest-operations) — Define business operations for AdminPromotionRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [ProductImage Operations](./03-functional-requirements.md#productimage-operations) — Define business operations for ProductImage: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [WishlistItem Operations](./03-functional-requirements.md#wishlistitem-operations) — Define business operations for WishlistItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [CartItem Operations](./03-functional-requirements.md#cartitem-operations) — Define business operations for CartItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [49] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [50] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [51] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [52] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [53] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [54] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [55] [Address Operations](./03-functional-requirements.md#address-operations) — Define business operations for Address: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [56] [Snapshot Operations](./03-functional-requirements.md#snapshot-operations) — Define business operations for Snapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [57] [Customer Error Scenarios](./03-functional-requirements.md#customer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Customer operations.
  - [58] [CustomerProfile Error Scenarios](./03-functional-requirements.md#customerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CustomerProfile operations.
  - [59] [Seller Error Scenarios](./03-functional-requirements.md#seller-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Seller operations.
  - [60] [SellerProfile Error Scenarios](./03-functional-requirements.md#sellerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfile operations.
  - [61] [SellerRegistration Error Scenarios](./03-functional-requirements.md#sellerregistration-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerRegistration operations.
  - [62] [Administrator Error Scenarios](./03-functional-requirements.md#administrator-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Administrator operations.
  - [63] [AdminPromotionRequest Error Scenarios](./03-functional-requirements.md#adminpromotionrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdminPromotionRequest operations.
  - [64] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [65] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [66] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [67] [ProductImage Error Scenarios](./03-functional-requirements.md#productimage-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductImage operations.
  - [68] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [69] [WishlistItem Error Scenarios](./03-functional-requirements.md#wishlistitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all WishlistItem operations.
  - [70] [CartItem Error Scenarios](./03-functional-requirements.md#cartitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CartItem operations.
  - [71] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [72] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItem operations.
  - [73] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [74] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [75] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequest operations.
  - [76] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [77] [Address Error Scenarios](./03-functional-requirements.md#address-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Address operations.
  - [78] [Snapshot Error Scenarios](./03-functional-requirements.md#snapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Snapshot operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [79] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [80] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [81] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [82] [Customer Rules](./04-business-rules.md#customer-rules) — Define validation rules and domain constraints for Customer. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [83] [CustomerProfile Rules](./04-business-rules.md#customerprofile-rules) — Define validation rules and domain constraints for CustomerProfile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [84] [Seller Rules](./04-business-rules.md#seller-rules) — Define validation rules and domain constraints for Seller. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [85] [SellerProfile Rules](./04-business-rules.md#sellerprofile-rules) — Define validation rules and domain constraints for SellerProfile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [86] [SellerRegistration Rules](./04-business-rules.md#sellerregistration-rules) — Define validation rules and domain constraints for SellerRegistration. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [87] [Administrator Rules](./04-business-rules.md#administrator-rules) — Define validation rules and domain constraints for Administrator. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [88] [AdminPromotionRequest Rules](./04-business-rules.md#adminpromotionrequest-rules) — Define validation rules and domain constraints for AdminPromotionRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [89] [Category Rules](./04-business-rules.md#category-rules) — Define validation rules and domain constraints for Category. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [90] [Product Rules](./04-business-rules.md#product-rules) — Define validation rules and domain constraints for Product. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [91] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define validation rules and domain constraints for ProductVariant. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [92] [ProductImage Rules](./04-business-rules.md#productimage-rules) — Define validation rules and domain constraints for ProductImage. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [93] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define validation rules and domain constraints for InventoryRecord. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [94] [WishlistItem Rules](./04-business-rules.md#wishlistitem-rules) — Define validation rules and domain constraints for WishlistItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [95] [CartItem Rules](./04-business-rules.md#cartitem-rules) — Define validation rules and domain constraints for CartItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [96] [Order Rules](./04-business-rules.md#order-rules) — Define validation rules and domain constraints for Order. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [97] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define validation rules and domain constraints for OrderItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [98] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define validation rules and domain constraints for Shipment. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [99] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define validation rules and domain constraints for CancellationRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [100] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define validation rules and domain constraints for RefundRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [101] [Review Rules](./04-business-rules.md#review-rules) — Define validation rules and domain constraints for Review. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [102] [Address Rules](./04-business-rules.md#address-rules) — Define validation rules and domain constraints for Address. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [103] [Snapshot Rules](./04-business-rules.md#snapshot-rules) — Define validation rules and domain constraints for Snapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [104] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [105] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [106] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [107] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [108] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [109] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [110] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [111] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

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

- **Customer** — hasOne CustomerProfile, hasMany Address, hasMany WishlistItem, hasMany CartItem, hasMany Order, hasMany Review, hasMany AdminPromotionRequest
- **CustomerProfile** — belongsTo Customer via customerId
- **Seller** — hasOne SellerProfile, hasMany Product, hasMany Shipment, hasMany OrderItem through Product, hasMany SellerRegistration, hasMany AdminPromotionRequest
- **SellerProfile** — belongsTo Seller via sellerId
- **SellerRegistration** — belongsTo Seller via sellerId
- **Administrator** — belongsTo Customer or Seller via userId, hasMany AdminPromotionRequest as reviewer
- **AdminPromotionRequest** — belongsTo Customer or Seller via requesterId, belongsTo Administrator via reviewerId
- **Category** — hasMany Category as subcategories via parentId, belongsTo Category as parent via parentId, hasMany Product
- **Product** — belongsTo Category via categoryId, belongsTo Seller via sellerId, hasMany ProductVariant, hasMany ProductImage, hasMany WishlistItem, hasMany CartItem, hasMany OrderItem, hasMany Review, hasMany ProductSnapshot
- **ProductVariant** — belongsTo Product via productId, hasMany CartItem, hasMany OrderItem, hasMany InventoryRecord, hasMany ProductVariantSnapshot
- **ProductImage** — belongsTo Product via productId
- **InventoryRecord** — belongsTo ProductVariant via variantId
- **WishlistItem** — belongsTo Customer via customerId, belongsTo Product via productId
- **CartItem** — belongsTo Customer via customerId, belongsTo ProductVariant via variantId
- **Order** — belongsTo Customer via customerId, hasMany OrderItem, hasMany Shipment
- **OrderItem** — belongsTo Order via orderId, belongsTo Product via productId, belongsTo ProductVariant via variantId, belongsTo Seller via sellerId, hasOne ProductSnapshot, hasOne ProductVariantSnapshot, hasOne SellerProfileSnapshot, hasMany CancellationRequest, hasMany RefundRequest
- **Shipment** — belongsTo Seller via sellerId, belongsTo Order via orderId, hasMany OrderItem
- **CancellationRequest** — belongsTo OrderItem via orderItemId, hasMany CancellationRequestSnapshot
- **RefundRequest** — belongsTo OrderItem via orderItemId, hasMany RefundRequestSnapshot
- **Review** — belongsTo Customer via customerId, belongsTo Product via productId, belongsTo Order via orderId, hasMany ReviewSnapshot
- **Address** — belongsTo Customer via customerId
- **Snapshot** — polymorphic - belongs to various entities

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
- external-integration