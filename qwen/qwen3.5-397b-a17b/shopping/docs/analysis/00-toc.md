### Table of Contents

**shoppingMall** is a backend service with the following actors and domain entities.

**Actors**: customer, seller, admin, superAdmin
**Entities**: User, CustomerProfile, SellerProfile, Address, Category, Product, ProductImage, ProductVariant, InventoryRecord, Wishlist, Cart, CartItem, Order, OrderItem, Shipment, ProductSnapshot, ProductVariantSnapshot, SellerProfileSnapshot, Review, ReviewSnapshot, AdminRequest, CancellationRequest, CancellationRequestSnapshot, RefundRequest, RefundRequestSnapshot, Administrator

---

**Scope**

- **User** — has one CustomerProfile or SellerProfile, can have Administrator role, owns multiple Addresses
- **CustomerProfile** — belongs to User, owns multiple Addresses, has multiple Orders, has multiple Reviews
- **SellerProfile** — belongs to User, owns multiple Products, has multiple OrderItems, has multiple SellerProfileSnapshots
- **Address** — belongs to CustomerProfile
- **Category** — can have one parent Category, can have multiple subcategories, contains multiple Products
- **Product** — belongs to SellerProfile, belongs to Category, has multiple ProductImages, has multiple ProductVariants, has multiple ProductSnapshots, can be in multiple Wishlists
- **ProductImage** — belongs to Product
- **ProductVariant** — belongs to Product, has multiple InventoryRecords, has multiple ProductVariantSnapshots, can be in CartItems, can be in OrderItems
- **InventoryRecord** — belongs to ProductVariant
- **Wishlist** — belongs to CustomerProfile, contains multiple Products
- **Cart** — belongs to CustomerProfile, contains multiple CartItems
- **CartItem** — belongs to Cart, references ProductVariant
- **Order** — belongs to CustomerProfile, contains multiple OrderItems, uses one Address for shipping
- **OrderItem** — belongs to Order, references ProductVariant, references ProductSnapshot, references SellerProfileSnapshot, can have CancellationRequest, can have RefundRequest, belongs to Shipment
- **Shipment** — contains multiple OrderItems from same seller, belongs to Order
- **ProductSnapshot** — captures state of Product, contains multiple ProductVariantSnapshots, referenced by OrderItems
- **ProductVariantSnapshot** — captures state of ProductVariant, belongs to ProductSnapshot, referenced by OrderItems
- **SellerProfileSnapshot** — captures state of SellerProfile, referenced by OrderItems
- **Review** — belongs to CustomerProfile, belongs to Product, has multiple ReviewSnapshots
- **ReviewSnapshot** — captures state of Review
- **AdminRequest** — submitted by User, reviewed by SuperAdmin
- **CancellationRequest** — submitted by CustomerProfile, belongs to OrderItem, has multiple CancellationRequestSnapshots
- **CancellationRequestSnapshot** — captures state of CancellationRequest
- **RefundRequest** — submitted by CustomerProfile, belongs to OrderItem, has multiple RefundRequestSnapshots
- **RefundRequestSnapshot** — captures state of RefundRequest
- **Administrator** — belongs to User, can be promoted by SuperAdmin

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
  - [1] [customer Actor](./01-actors-and-auth.md#customer-actor) — Define the customer actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [2] [seller Actor](./01-actors-and-auth.md#seller-actor) — Define the seller actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [3] [admin Actor](./01-actors-and-auth.md#admin-actor) — Define the admin actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [4] [superAdmin Actor](./01-actors-and-auth.md#superadmin-actor) — Define the superAdmin actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [5] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [6] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [7] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [8] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [CustomerProfile Concept](./02-domain-model.md#customerprofile-concept) — Describe what CustomerProfile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [SellerProfile Concept](./02-domain-model.md#sellerprofile-concept) — Describe what SellerProfile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
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
  - [23] [ProductSnapshot Concept](./02-domain-model.md#productsnapshot-concept) — Describe what ProductSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [24] [ProductVariantSnapshot Concept](./02-domain-model.md#productvariantsnapshot-concept) — Describe what ProductVariantSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [25] [SellerProfileSnapshot Concept](./02-domain-model.md#sellerprofilesnapshot-concept) — Describe what SellerProfileSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [26] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [27] [ReviewSnapshot Concept](./02-domain-model.md#reviewsnapshot-concept) — Describe what ReviewSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [28] [AdminRequest Concept](./02-domain-model.md#adminrequest-concept) — Describe what AdminRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [29] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [30] [CancellationRequestSnapshot Concept](./02-domain-model.md#cancellationrequestsnapshot-concept) — Describe what CancellationRequestSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [31] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [32] [RefundRequestSnapshot Concept](./02-domain-model.md#refundrequestsnapshot-concept) — Describe what RefundRequestSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [33] [Administrator Concept](./02-domain-model.md#administrator-concept) — Describe what Administrator represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [34] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [35] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [36] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [37] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [38] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [CustomerProfile Operations](./03-functional-requirements.md#customerprofile-operations) — Define business operations for CustomerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [SellerProfile Operations](./03-functional-requirements.md#sellerprofile-operations) — Define business operations for SellerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [Address Operations](./03-functional-requirements.md#address-operations) — Define business operations for Address: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [ProductImage Operations](./03-functional-requirements.md#productimage-operations) — Define business operations for ProductImage: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [Wishlist Operations](./03-functional-requirements.md#wishlist-operations) — Define business operations for Wishlist: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [Cart Operations](./03-functional-requirements.md#cart-operations) — Define business operations for Cart: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [49] [CartItem Operations](./03-functional-requirements.md#cartitem-operations) — Define business operations for CartItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [50] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [51] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [52] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [53] [ProductSnapshot Operations](./03-functional-requirements.md#productsnapshot-operations) — Define business operations for ProductSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [54] [ProductVariantSnapshot Operations](./03-functional-requirements.md#productvariantsnapshot-operations) — Define business operations for ProductVariantSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [55] [SellerProfileSnapshot Operations](./03-functional-requirements.md#sellerprofilesnapshot-operations) — Define business operations for SellerProfileSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [56] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [57] [ReviewSnapshot Operations](./03-functional-requirements.md#reviewsnapshot-operations) — Define business operations for ReviewSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [58] [AdminRequest Operations](./03-functional-requirements.md#adminrequest-operations) — Define business operations for AdminRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [59] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [60] [CancellationRequestSnapshot Operations](./03-functional-requirements.md#cancellationrequestsnapshot-operations) — Define business operations for CancellationRequestSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [61] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [62] [RefundRequestSnapshot Operations](./03-functional-requirements.md#refundrequestsnapshot-operations) — Define business operations for RefundRequestSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [63] [Administrator Operations](./03-functional-requirements.md#administrator-operations) — Define business operations for Administrator: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [64] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [65] [CustomerProfile Error Scenarios](./03-functional-requirements.md#customerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CustomerProfile operations.
  - [66] [SellerProfile Error Scenarios](./03-functional-requirements.md#sellerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfile operations.
  - [67] [Address Error Scenarios](./03-functional-requirements.md#address-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Address operations.
  - [68] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [69] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [70] [ProductImage Error Scenarios](./03-functional-requirements.md#productimage-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductImage operations.
  - [71] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [72] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [73] [Wishlist Error Scenarios](./03-functional-requirements.md#wishlist-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Wishlist operations.
  - [74] [Cart Error Scenarios](./03-functional-requirements.md#cart-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Cart operations.
  - [75] [CartItem Error Scenarios](./03-functional-requirements.md#cartitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CartItem operations.
  - [76] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [77] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItem operations.
  - [78] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [79] [ProductSnapshot Error Scenarios](./03-functional-requirements.md#productsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductSnapshot operations.
  - [80] [ProductVariantSnapshot Error Scenarios](./03-functional-requirements.md#productvariantsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariantSnapshot operations.
  - [81] [SellerProfileSnapshot Error Scenarios](./03-functional-requirements.md#sellerprofilesnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfileSnapshot operations.
  - [82] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [83] [ReviewSnapshot Error Scenarios](./03-functional-requirements.md#reviewsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ReviewSnapshot operations.
  - [84] [AdminRequest Error Scenarios](./03-functional-requirements.md#adminrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdminRequest operations.
  - [85] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [86] [CancellationRequestSnapshot Error Scenarios](./03-functional-requirements.md#cancellationrequestsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequestSnapshot operations.
  - [87] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequest operations.
  - [88] [RefundRequestSnapshot Error Scenarios](./03-functional-requirements.md#refundrequestsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequestSnapshot operations.
  - [89] [Administrator Error Scenarios](./03-functional-requirements.md#administrator-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Administrator operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [90] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [91] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [92] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [93] [User Rules](./04-business-rules.md#user-rules) — Define validation rules and domain constraints for User. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [94] [CustomerProfile Rules](./04-business-rules.md#customerprofile-rules) — Define validation rules and domain constraints for CustomerProfile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [95] [SellerProfile Rules](./04-business-rules.md#sellerprofile-rules) — Define validation rules and domain constraints for SellerProfile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [96] [Address Rules](./04-business-rules.md#address-rules) — Define validation rules and domain constraints for Address. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [97] [Category Rules](./04-business-rules.md#category-rules) — Define validation rules and domain constraints for Category. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [98] [Product Rules](./04-business-rules.md#product-rules) — Define validation rules and domain constraints for Product. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [99] [ProductImage Rules](./04-business-rules.md#productimage-rules) — Define validation rules and domain constraints for ProductImage. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [100] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define validation rules and domain constraints for ProductVariant. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [101] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define validation rules and domain constraints for InventoryRecord. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [102] [Wishlist Rules](./04-business-rules.md#wishlist-rules) — Define validation rules and domain constraints for Wishlist. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [103] [Cart Rules](./04-business-rules.md#cart-rules) — Define validation rules and domain constraints for Cart. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [104] [CartItem Rules](./04-business-rules.md#cartitem-rules) — Define validation rules and domain constraints for CartItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [105] [Order Rules](./04-business-rules.md#order-rules) — Define validation rules and domain constraints for Order. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [106] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define validation rules and domain constraints for OrderItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [107] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define validation rules and domain constraints for Shipment. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [108] [ProductSnapshot Rules](./04-business-rules.md#productsnapshot-rules) — Define validation rules and domain constraints for ProductSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [109] [ProductVariantSnapshot Rules](./04-business-rules.md#productvariantsnapshot-rules) — Define validation rules and domain constraints for ProductVariantSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [110] [SellerProfileSnapshot Rules](./04-business-rules.md#sellerprofilesnapshot-rules) — Define validation rules and domain constraints for SellerProfileSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [111] [Review Rules](./04-business-rules.md#review-rules) — Define validation rules and domain constraints for Review. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [112] [ReviewSnapshot Rules](./04-business-rules.md#reviewsnapshot-rules) — Define validation rules and domain constraints for ReviewSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [113] [AdminRequest Rules](./04-business-rules.md#adminrequest-rules) — Define validation rules and domain constraints for AdminRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [114] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define validation rules and domain constraints for CancellationRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [115] [CancellationRequestSnapshot Rules](./04-business-rules.md#cancellationrequestsnapshot-rules) — Define validation rules and domain constraints for CancellationRequestSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [116] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define validation rules and domain constraints for RefundRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [117] [RefundRequestSnapshot Rules](./04-business-rules.md#refundrequestsnapshot-rules) — Define validation rules and domain constraints for RefundRequestSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [118] [Administrator Rules](./04-business-rules.md#administrator-rules) — Define validation rules and domain constraints for Administrator. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [119] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [120] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [121] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [122] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [123] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [124] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [125] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [126] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.

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

- **User** — has one CustomerProfile or SellerProfile, can have Administrator role, owns multiple Addresses
- **CustomerProfile** — belongs to User, owns multiple Addresses, has multiple Orders, has multiple Reviews
- **SellerProfile** — belongs to User, owns multiple Products, has multiple OrderItems, has multiple SellerProfileSnapshots
- **Address** — belongs to CustomerProfile
- **Category** — can have one parent Category, can have multiple subcategories, contains multiple Products
- **Product** — belongs to SellerProfile, belongs to Category, has multiple ProductImages, has multiple ProductVariants, has multiple ProductSnapshots, can be in multiple Wishlists
- **ProductImage** — belongs to Product
- **ProductVariant** — belongs to Product, has multiple InventoryRecords, has multiple ProductVariantSnapshots, can be in CartItems, can be in OrderItems
- **InventoryRecord** — belongs to ProductVariant
- **Wishlist** — belongs to CustomerProfile, contains multiple Products
- **Cart** — belongs to CustomerProfile, contains multiple CartItems
- **CartItem** — belongs to Cart, references ProductVariant
- **Order** — belongs to CustomerProfile, contains multiple OrderItems, uses one Address for shipping
- **OrderItem** — belongs to Order, references ProductVariant, references ProductSnapshot, references SellerProfileSnapshot, can have CancellationRequest, can have RefundRequest, belongs to Shipment
- **Shipment** — contains multiple OrderItems from same seller, belongs to Order
- **ProductSnapshot** — captures state of Product, contains multiple ProductVariantSnapshots, referenced by OrderItems
- **ProductVariantSnapshot** — captures state of ProductVariant, belongs to ProductSnapshot, referenced by OrderItems
- **SellerProfileSnapshot** — captures state of SellerProfile, referenced by OrderItems
- **Review** — belongs to CustomerProfile, belongs to Product, has multiple ReviewSnapshots
- **ReviewSnapshot** — captures state of Review
- **AdminRequest** — submitted by User, reviewed by SuperAdmin
- **CancellationRequest** — submitted by CustomerProfile, belongs to OrderItem, has multiple CancellationRequestSnapshots
- **CancellationRequestSnapshot** — captures state of CancellationRequest
- **RefundRequest** — submitted by CustomerProfile, belongs to OrderItem, has multiple RefundRequestSnapshots
- **RefundRequestSnapshot** — captures state of RefundRequest
- **Administrator** — belongs to User, can be promoted by SuperAdmin

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