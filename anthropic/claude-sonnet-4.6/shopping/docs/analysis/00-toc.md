### Table of Contents

**shoppingMall** is a backend service with the following actors and domain entities.

**Actors**: guest, customer, seller, admin, superAdmin
**Entities**: Customer, Seller, Admin, AdminRequest, SellerApproval, CustomerAddress, Category, Product, ProductImage, ProductVariant, ProductSnapshot, ProductSnapshotSKU, SellerProfileSnapshot, InventoryRecord, WishlistItem, CartItem, Order, OrderItem, OrderItemSnapshot, Shipment, CancellationRequest, CancellationRequestSnapshot, RefundRequest, RefundRequestSnapshot, Review, ReviewSnapshot

---

**Scope**

- **Customer** — has many CustomerAddress, has many CartItem, has many WishlistItem, has many Order, has many Review, may have AdminRequest
- **Seller** — has many Product, has many SellerProfileSnapshot, has many SellerApproval
- **Admin** — may have many AdminRequest approvals
- **AdminRequest** — belongs to Customer or Seller requester, reviewed by Admin (superAdmin)
- **SellerApproval** — belongs to Seller, reviewed by Admin
- **CustomerAddress** — belongs to Customer
- **Category** — may have one parent Category (subcategory), has many Product
- **Product** — belongs to Seller, belongs to Category, has many ProductImage, has many ProductVariant, has many ProductSnapshot
- **ProductImage** — belongs to Product
- **ProductVariant** — belongs to Product, has many InventoryRecord, has many CartItem
- **ProductSnapshot** — belongs to Product, has many ProductSnapshotSKU
- **ProductSnapshotSKU** — belongs to ProductSnapshot
- **SellerProfileSnapshot** — belongs to Seller
- **InventoryRecord** — belongs to ProductVariant
- **WishlistItem** — belongs to Customer, belongs to Product
- **CartItem** — belongs to Customer, belongs to ProductVariant
- **Order** — belongs to Customer, has many OrderItem, has many Shipment
- **OrderItem** — belongs to Order, belongs to ProductVariant, has one OrderItemSnapshot, may have CancellationRequest, may have RefundRequest, may belong to Shipment
- **OrderItemSnapshot** — belongs to OrderItem, references ProductSnapshot, references SellerProfileSnapshot
- **Shipment** — belongs to Order, belongs to Seller, has many OrderItem
- **CancellationRequest** — belongs to OrderItem, has many CancellationRequestSnapshot
- **CancellationRequestSnapshot** — belongs to CancellationRequest
- **RefundRequest** — belongs to OrderItem, has many RefundRequestSnapshot
- **RefundRequestSnapshot** — belongs to RefundRequest
- **Review** — belongs to Customer, belongs to Product, belongs to OrderItem, has many ReviewSnapshot
- **ReviewSnapshot** — belongs to Review

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
  - [10] [Seller Concept](./02-domain-model.md#seller-concept) — Describe what Seller represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Admin Concept](./02-domain-model.md#admin-concept) — Describe what Admin represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [AdminRequest Concept](./02-domain-model.md#adminrequest-concept) — Describe what AdminRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [SellerApproval Concept](./02-domain-model.md#sellerapproval-concept) — Describe what SellerApproval represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [CustomerAddress Concept](./02-domain-model.md#customeraddress-concept) — Describe what CustomerAddress represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [Category Concept](./02-domain-model.md#category-concept) — Describe what Category represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [ProductImage Concept](./02-domain-model.md#productimage-concept) — Describe what ProductImage represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [ProductVariant Concept](./02-domain-model.md#productvariant-concept) — Describe what ProductVariant represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [ProductSnapshot Concept](./02-domain-model.md#productsnapshot-concept) — Describe what ProductSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [ProductSnapshotSKU Concept](./02-domain-model.md#productsnapshotsku-concept) — Describe what ProductSnapshotSKU represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [21] [SellerProfileSnapshot Concept](./02-domain-model.md#sellerprofilesnapshot-concept) — Describe what SellerProfileSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [22] [InventoryRecord Concept](./02-domain-model.md#inventoryrecord-concept) — Describe what InventoryRecord represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [23] [WishlistItem Concept](./02-domain-model.md#wishlistitem-concept) — Describe what WishlistItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [24] [CartItem Concept](./02-domain-model.md#cartitem-concept) — Describe what CartItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [25] [Order Concept](./02-domain-model.md#order-concept) — Describe what Order represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [26] [OrderItem Concept](./02-domain-model.md#orderitem-concept) — Describe what OrderItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [27] [OrderItemSnapshot Concept](./02-domain-model.md#orderitemsnapshot-concept) — Describe what OrderItemSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [28] [Shipment Concept](./02-domain-model.md#shipment-concept) — Describe what Shipment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [29] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [30] [CancellationRequestSnapshot Concept](./02-domain-model.md#cancellationrequestsnapshot-concept) — Describe what CancellationRequestSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [31] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [32] [RefundRequestSnapshot Concept](./02-domain-model.md#refundrequestsnapshot-concept) — Describe what RefundRequestSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [33] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [34] [ReviewSnapshot Concept](./02-domain-model.md#reviewsnapshot-concept) — Describe what ReviewSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [35] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [36] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [37] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [38] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [39] [Customer Operations](./03-functional-requirements.md#customer-operations) — Define business operations for Customer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [Seller Operations](./03-functional-requirements.md#seller-operations) — Define business operations for Seller: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [Admin Operations](./03-functional-requirements.md#admin-operations) — Define business operations for Admin: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [AdminRequest Operations](./03-functional-requirements.md#adminrequest-operations) — Define business operations for AdminRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [SellerApproval Operations](./03-functional-requirements.md#sellerapproval-operations) — Define business operations for SellerApproval: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [CustomerAddress Operations](./03-functional-requirements.md#customeraddress-operations) — Define business operations for CustomerAddress: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [ProductImage Operations](./03-functional-requirements.md#productimage-operations) — Define business operations for ProductImage: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [49] [ProductSnapshot Operations](./03-functional-requirements.md#productsnapshot-operations) — Define business operations for ProductSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [50] [ProductSnapshotSKU Operations](./03-functional-requirements.md#productsnapshotsku-operations) — Define business operations for ProductSnapshotSKU: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [51] [SellerProfileSnapshot Operations](./03-functional-requirements.md#sellerprofilesnapshot-operations) — Define business operations for SellerProfileSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [52] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [53] [WishlistItem Operations](./03-functional-requirements.md#wishlistitem-operations) — Define business operations for WishlistItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [54] [CartItem Operations](./03-functional-requirements.md#cartitem-operations) — Define business operations for CartItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [55] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [56] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [57] [OrderItemSnapshot Operations](./03-functional-requirements.md#orderitemsnapshot-operations) — Define business operations for OrderItemSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [58] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [59] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [60] [CancellationRequestSnapshot Operations](./03-functional-requirements.md#cancellationrequestsnapshot-operations) — Define business operations for CancellationRequestSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [61] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [62] [RefundRequestSnapshot Operations](./03-functional-requirements.md#refundrequestsnapshot-operations) — Define business operations for RefundRequestSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [63] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [64] [ReviewSnapshot Operations](./03-functional-requirements.md#reviewsnapshot-operations) — Define business operations for ReviewSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [65] [Customer Error Scenarios](./03-functional-requirements.md#customer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Customer operations.
  - [66] [Seller Error Scenarios](./03-functional-requirements.md#seller-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Seller operations.
  - [67] [Admin Error Scenarios](./03-functional-requirements.md#admin-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Admin operations.
  - [68] [AdminRequest Error Scenarios](./03-functional-requirements.md#adminrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdminRequest operations.
  - [69] [SellerApproval Error Scenarios](./03-functional-requirements.md#sellerapproval-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerApproval operations.
  - [70] [CustomerAddress Error Scenarios](./03-functional-requirements.md#customeraddress-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CustomerAddress operations.
  - [71] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [72] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [73] [ProductImage Error Scenarios](./03-functional-requirements.md#productimage-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductImage operations.
  - [74] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [75] [ProductSnapshot Error Scenarios](./03-functional-requirements.md#productsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductSnapshot operations.
  - [76] [ProductSnapshotSKU Error Scenarios](./03-functional-requirements.md#productsnapshotsku-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductSnapshotSKU operations.
  - [77] [SellerProfileSnapshot Error Scenarios](./03-functional-requirements.md#sellerprofilesnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfileSnapshot operations.
  - [78] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [79] [WishlistItem Error Scenarios](./03-functional-requirements.md#wishlistitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all WishlistItem operations.
  - [80] [CartItem Error Scenarios](./03-functional-requirements.md#cartitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CartItem operations.
  - [81] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [82] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItem operations.
  - [83] [OrderItemSnapshot Error Scenarios](./03-functional-requirements.md#orderitemsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItemSnapshot operations.
  - [84] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [85] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [86] [CancellationRequestSnapshot Error Scenarios](./03-functional-requirements.md#cancellationrequestsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequestSnapshot operations.
  - [87] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequest operations.
  - [88] [RefundRequestSnapshot Error Scenarios](./03-functional-requirements.md#refundrequestsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequestSnapshot operations.
  - [89] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [90] [ReviewSnapshot Error Scenarios](./03-functional-requirements.md#reviewsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ReviewSnapshot operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [91] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [92] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [93] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [94] [Customer Rules](./04-business-rules.md#customer-rules) — Define validation rules and domain constraints for Customer. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [95] [Seller Rules](./04-business-rules.md#seller-rules) — Define validation rules and domain constraints for Seller. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [96] [Admin Rules](./04-business-rules.md#admin-rules) — Define validation rules and domain constraints for Admin. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [97] [AdminRequest Rules](./04-business-rules.md#adminrequest-rules) — Define validation rules and domain constraints for AdminRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [98] [SellerApproval Rules](./04-business-rules.md#sellerapproval-rules) — Define validation rules and domain constraints for SellerApproval. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [99] [CustomerAddress Rules](./04-business-rules.md#customeraddress-rules) — Define validation rules and domain constraints for CustomerAddress. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [100] [Category Rules](./04-business-rules.md#category-rules) — Define validation rules and domain constraints for Category. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [101] [Product Rules](./04-business-rules.md#product-rules) — Define validation rules and domain constraints for Product. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [102] [ProductImage Rules](./04-business-rules.md#productimage-rules) — Define validation rules and domain constraints for ProductImage. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [103] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define validation rules and domain constraints for ProductVariant. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [104] [ProductSnapshot Rules](./04-business-rules.md#productsnapshot-rules) — Define validation rules and domain constraints for ProductSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [105] [ProductSnapshotSKU Rules](./04-business-rules.md#productsnapshotsku-rules) — Define validation rules and domain constraints for ProductSnapshotSKU. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [106] [SellerProfileSnapshot Rules](./04-business-rules.md#sellerprofilesnapshot-rules) — Define validation rules and domain constraints for SellerProfileSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [107] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define validation rules and domain constraints for InventoryRecord. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [108] [WishlistItem Rules](./04-business-rules.md#wishlistitem-rules) — Define validation rules and domain constraints for WishlistItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [109] [CartItem Rules](./04-business-rules.md#cartitem-rules) — Define validation rules and domain constraints for CartItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [110] [Order Rules](./04-business-rules.md#order-rules) — Define validation rules and domain constraints for Order. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [111] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define validation rules and domain constraints for OrderItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [112] [OrderItemSnapshot Rules](./04-business-rules.md#orderitemsnapshot-rules) — Define validation rules and domain constraints for OrderItemSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [113] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define validation rules and domain constraints for Shipment. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [114] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define validation rules and domain constraints for CancellationRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [115] [CancellationRequestSnapshot Rules](./04-business-rules.md#cancellationrequestsnapshot-rules) — Define validation rules and domain constraints for CancellationRequestSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [116] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define validation rules and domain constraints for RefundRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [117] [RefundRequestSnapshot Rules](./04-business-rules.md#refundrequestsnapshot-rules) — Define validation rules and domain constraints for RefundRequestSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [118] [Review Rules](./04-business-rules.md#review-rules) — Define validation rules and domain constraints for Review. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [119] [ReviewSnapshot Rules](./04-business-rules.md#reviewsnapshot-rules) — Define validation rules and domain constraints for ReviewSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [120] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [121] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [122] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [123] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [124] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [125] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [126] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [127] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **Customer** — has many CustomerAddress, has many CartItem, has many WishlistItem, has many Order, has many Review, may have AdminRequest
- **Seller** — has many Product, has many SellerProfileSnapshot, has many SellerApproval
- **Admin** — may have many AdminRequest approvals
- **AdminRequest** — belongs to Customer or Seller requester, reviewed by Admin (superAdmin)
- **SellerApproval** — belongs to Seller, reviewed by Admin
- **CustomerAddress** — belongs to Customer
- **Category** — may have one parent Category (subcategory), has many Product
- **Product** — belongs to Seller, belongs to Category, has many ProductImage, has many ProductVariant, has many ProductSnapshot
- **ProductImage** — belongs to Product
- **ProductVariant** — belongs to Product, has many InventoryRecord, has many CartItem
- **ProductSnapshot** — belongs to Product, has many ProductSnapshotSKU
- **ProductSnapshotSKU** — belongs to ProductSnapshot
- **SellerProfileSnapshot** — belongs to Seller
- **InventoryRecord** — belongs to ProductVariant
- **WishlistItem** — belongs to Customer, belongs to Product
- **CartItem** — belongs to Customer, belongs to ProductVariant
- **Order** — belongs to Customer, has many OrderItem, has many Shipment
- **OrderItem** — belongs to Order, belongs to ProductVariant, has one OrderItemSnapshot, may have CancellationRequest, may have RefundRequest, may belong to Shipment
- **OrderItemSnapshot** — belongs to OrderItem, references ProductSnapshot, references SellerProfileSnapshot
- **Shipment** — belongs to Order, belongs to Seller, has many OrderItem
- **CancellationRequest** — belongs to OrderItem, has many CancellationRequestSnapshot
- **CancellationRequestSnapshot** — belongs to CancellationRequest
- **RefundRequest** — belongs to OrderItem, has many RefundRequestSnapshot
- **RefundRequestSnapshot** — belongs to RefundRequest
- **Review** — belongs to Customer, belongs to Product, belongs to OrderItem, has many ReviewSnapshot
- **ReviewSnapshot** — belongs to Review

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