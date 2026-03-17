### Table of Contents

**shoppingMall** is a backend service with the following actors and domain entities.

**Actors**: customer, seller, administrator, superAdministrator
**Entities**: CustomerAccount, CustomerProfile, ShippingAddress, SellerAccount, SellerApprovalRequest, SellerProfile, AdministratorAccount, AdministratorRequest, Category, Product, ProductImage, ProductVariant, InventoryRecord, ProductSnapshot, ProductVariantSnapshot, WishlistEntry, CartItem, Order, OrderAddressSnapshot, OrderItem, ProductPurchaseSnapshot, SellerProfilePurchaseSnapshot, Shipment, TrackingInfo, CancellationRequest, CancellationRequestSnapshot, RefundRequest, RefundRequestSnapshot, Review, ReviewSnapshot, PaymentAttempt, ProductSearchQuery

---

**Scope**

- **CustomerAccount** — has one CustomerProfile, has many ShippingAddress, has many Order, has many WishlistEntry, has many CartItem, has many Review, can submit one or more AdministratorRequest
- **CustomerProfile** — belongs to CustomerAccount
- **ShippingAddress** — belongs to CustomerAccount, can be copied into Order as an order-time shipping snapshot
- **SellerAccount** — has one SellerProfile, has many SellerApprovalRequest, has many Product, fulfills many OrderItem through Shipment, can submit one or more AdministratorRequest
- **SellerApprovalRequest** — belongs to SellerAccount, reviewed by AdministratorAccount
- **SellerProfile** — belongs to SellerAccount, visible to CustomerAccount, has many SellerProfileSnapshot, its purchase-time state can be preserved in OrderItem
- **AdministratorAccount** — reviews SellerApprovalRequest, reviews AdministratorRequest, manages Category, oversees Product, oversees Order
- **AdministratorRequest** — submitted by CustomerAccount or SellerAccount, reviewed by AdministratorAccount
- **Category** — may have one parent Category, may have many child Categories, has many Product
- **Product** — belongs to SellerAccount, belongs to Category or may become uncategorized, has many ProductImage, has many ProductVariant, has many ProductSnapshot, appears in many WishlistEntry, appears in search results and category listings, has many Review
- **ProductImage** — belongs to Product, included in ProductSnapshot
- **ProductVariant** — belongs to Product, has many InventoryRecord, has many ProductVariantSnapshot, can appear in CartItem, can appear in OrderItem
- **InventoryRecord** — belongs to ProductVariant, may be created by seller adjustment, order placement, cancellation approval, refund approval, or administrative action
- **ProductSnapshot** — belongs to Product, contains many ProductVariantSnapshot
- **ProductVariantSnapshot** — belongs to ProductVariant, may belong to ProductSnapshot, may be preserved in OrderItem as purchase-time state
- **WishlistEntry** — belongs to CustomerAccount, belongs to Product
- **CartItem** — belongs to CustomerAccount, references ProductVariant, references Product
- **Order** — belongs to CustomerAccount, has many OrderItem, has one OrderAddressSnapshot, has many Shipment
- **OrderAddressSnapshot** — belongs to Order
- **OrderItem** — belongs to Order, references SellerAccount for operational responsibility, references ProductVariant for inventory effects, has one ProductPurchaseSnapshot, has one SellerProfilePurchaseSnapshot, may belong to one Shipment, may have one CancellationRequest, may have one RefundRequest
- **ProductPurchaseSnapshot** — belongs to OrderItem
- **SellerProfilePurchaseSnapshot** — belongs to OrderItem
- **Shipment** — belongs to Order, belongs to SellerAccount, contains many OrderItem, has one TrackingInfo
- **TrackingInfo** — belongs to Shipment
- **CancellationRequest** — belongs to OrderItem, submitted by CustomerAccount, reviewed by SellerAccount or AdministratorAccount, has many CancellationRequestSnapshot
- **CancellationRequestSnapshot** — belongs to CancellationRequest
- **RefundRequest** — belongs to OrderItem, submitted by CustomerAccount, reviewed by SellerAccount or AdministratorAccount, has many RefundRequestSnapshot
- **RefundRequestSnapshot** — belongs to RefundRequest
- **Review** — belongs to CustomerAccount, belongs to Product, linked to Order and purchase context for eligibility, has many ReviewSnapshot
- **ReviewSnapshot** — belongs to Review
- **PaymentAttempt** — initiated by CustomerAccount, may result in one Order when successful
- **ProductSearchQuery** — returns many Product as search results

- **customer** (member)
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
  - [1] [customer Actor](./01-actors-and-auth.md#customer-actor) — Define the customer actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [2] [seller Actor](./01-actors-and-auth.md#seller-actor) — Define the seller actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [3] [administrator Actor](./01-actors-and-auth.md#administrator-actor) — Define the administrator actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [4] [superAdministrator Actor](./01-actors-and-auth.md#superadministrator-actor) — Define the superAdministrator actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [5] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [6] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [7] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [8] [CustomerAccount Concept](./02-domain-model.md#customeraccount-concept) — Describe what CustomerAccount represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [CustomerProfile Concept](./02-domain-model.md#customerprofile-concept) — Describe what CustomerProfile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [ShippingAddress Concept](./02-domain-model.md#shippingaddress-concept) — Describe what ShippingAddress represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [SellerAccount Concept](./02-domain-model.md#selleraccount-concept) — Describe what SellerAccount represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [SellerApprovalRequest Concept](./02-domain-model.md#sellerapprovalrequest-concept) — Describe what SellerApprovalRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [SellerProfile Concept](./02-domain-model.md#sellerprofile-concept) — Describe what SellerProfile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [AdministratorAccount Concept](./02-domain-model.md#administratoraccount-concept) — Describe what AdministratorAccount represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [AdministratorRequest Concept](./02-domain-model.md#administratorrequest-concept) — Describe what AdministratorRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [Category Concept](./02-domain-model.md#category-concept) — Describe what Category represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [ProductImage Concept](./02-domain-model.md#productimage-concept) — Describe what ProductImage represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [ProductVariant Concept](./02-domain-model.md#productvariant-concept) — Describe what ProductVariant represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [InventoryRecord Concept](./02-domain-model.md#inventoryrecord-concept) — Describe what InventoryRecord represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [21] [ProductSnapshot Concept](./02-domain-model.md#productsnapshot-concept) — Describe what ProductSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [22] [ProductVariantSnapshot Concept](./02-domain-model.md#productvariantsnapshot-concept) — Describe what ProductVariantSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [23] [WishlistEntry Concept](./02-domain-model.md#wishlistentry-concept) — Describe what WishlistEntry represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [24] [CartItem Concept](./02-domain-model.md#cartitem-concept) — Describe what CartItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [25] [Order Concept](./02-domain-model.md#order-concept) — Describe what Order represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [26] [OrderAddressSnapshot Concept](./02-domain-model.md#orderaddresssnapshot-concept) — Describe what OrderAddressSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [27] [OrderItem Concept](./02-domain-model.md#orderitem-concept) — Describe what OrderItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [28] [ProductPurchaseSnapshot Concept](./02-domain-model.md#productpurchasesnapshot-concept) — Describe what ProductPurchaseSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [29] [SellerProfilePurchaseSnapshot Concept](./02-domain-model.md#sellerprofilepurchasesnapshot-concept) — Describe what SellerProfilePurchaseSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [30] [Shipment Concept](./02-domain-model.md#shipment-concept) — Describe what Shipment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [31] [TrackingInfo Concept](./02-domain-model.md#trackinginfo-concept) — Describe what TrackingInfo represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [32] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [33] [CancellationRequestSnapshot Concept](./02-domain-model.md#cancellationrequestsnapshot-concept) — Describe what CancellationRequestSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [34] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [35] [RefundRequestSnapshot Concept](./02-domain-model.md#refundrequestsnapshot-concept) — Describe what RefundRequestSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [36] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [37] [ReviewSnapshot Concept](./02-domain-model.md#reviewsnapshot-concept) — Describe what ReviewSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [38] [PaymentAttempt Concept](./02-domain-model.md#paymentattempt-concept) — Describe what PaymentAttempt represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [39] [ProductSearchQuery Concept](./02-domain-model.md#productsearchquery-concept) — Describe what ProductSearchQuery represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [40] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [41] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [42] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [43] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [44] [CustomerAccount Operations](./03-functional-requirements.md#customeraccount-operations) — Define business operations for CustomerAccount: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [CustomerProfile Operations](./03-functional-requirements.md#customerprofile-operations) — Define business operations for CustomerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [ShippingAddress Operations](./03-functional-requirements.md#shippingaddress-operations) — Define business operations for ShippingAddress: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [SellerAccount Operations](./03-functional-requirements.md#selleraccount-operations) — Define business operations for SellerAccount: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [SellerApprovalRequest Operations](./03-functional-requirements.md#sellerapprovalrequest-operations) — Define business operations for SellerApprovalRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [49] [SellerProfile Operations](./03-functional-requirements.md#sellerprofile-operations) — Define business operations for SellerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [50] [AdministratorAccount Operations](./03-functional-requirements.md#administratoraccount-operations) — Define business operations for AdministratorAccount: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [51] [AdministratorRequest Operations](./03-functional-requirements.md#administratorrequest-operations) — Define business operations for AdministratorRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [52] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [53] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [54] [ProductImage Operations](./03-functional-requirements.md#productimage-operations) — Define business operations for ProductImage: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [55] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [56] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [57] [ProductSnapshot Operations](./03-functional-requirements.md#productsnapshot-operations) — Define business operations for ProductSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [58] [ProductVariantSnapshot Operations](./03-functional-requirements.md#productvariantsnapshot-operations) — Define business operations for ProductVariantSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [59] [WishlistEntry Operations](./03-functional-requirements.md#wishlistentry-operations) — Define business operations for WishlistEntry: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [60] [CartItem Operations](./03-functional-requirements.md#cartitem-operations) — Define business operations for CartItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [61] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [62] [OrderAddressSnapshot Operations](./03-functional-requirements.md#orderaddresssnapshot-operations) — Define business operations for OrderAddressSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [63] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [64] [ProductPurchaseSnapshot Operations](./03-functional-requirements.md#productpurchasesnapshot-operations) — Define business operations for ProductPurchaseSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [65] [SellerProfilePurchaseSnapshot Operations](./03-functional-requirements.md#sellerprofilepurchasesnapshot-operations) — Define business operations for SellerProfilePurchaseSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [66] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [67] [TrackingInfo Operations](./03-functional-requirements.md#trackinginfo-operations) — Define business operations for TrackingInfo: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [68] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [69] [CancellationRequestSnapshot Operations](./03-functional-requirements.md#cancellationrequestsnapshot-operations) — Define business operations for CancellationRequestSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [70] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [71] [RefundRequestSnapshot Operations](./03-functional-requirements.md#refundrequestsnapshot-operations) — Define business operations for RefundRequestSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [72] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [73] [ReviewSnapshot Operations](./03-functional-requirements.md#reviewsnapshot-operations) — Define business operations for ReviewSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [74] [PaymentAttempt Operations](./03-functional-requirements.md#paymentattempt-operations) — Define business operations for PaymentAttempt: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [75] [ProductSearchQuery Operations](./03-functional-requirements.md#productsearchquery-operations) — Define business operations for ProductSearchQuery: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [76] [CustomerAccount Error Scenarios](./03-functional-requirements.md#customeraccount-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CustomerAccount operations.
  - [77] [CustomerProfile Error Scenarios](./03-functional-requirements.md#customerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CustomerProfile operations.
  - [78] [ShippingAddress Error Scenarios](./03-functional-requirements.md#shippingaddress-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ShippingAddress operations.
  - [79] [SellerAccount Error Scenarios](./03-functional-requirements.md#selleraccount-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerAccount operations.
  - [80] [SellerApprovalRequest Error Scenarios](./03-functional-requirements.md#sellerapprovalrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerApprovalRequest operations.
  - [81] [SellerProfile Error Scenarios](./03-functional-requirements.md#sellerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfile operations.
  - [82] [AdministratorAccount Error Scenarios](./03-functional-requirements.md#administratoraccount-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdministratorAccount operations.
  - [83] [AdministratorRequest Error Scenarios](./03-functional-requirements.md#administratorrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdministratorRequest operations.
  - [84] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [85] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [86] [ProductImage Error Scenarios](./03-functional-requirements.md#productimage-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductImage operations.
  - [87] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [88] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [89] [ProductSnapshot Error Scenarios](./03-functional-requirements.md#productsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductSnapshot operations.
  - [90] [ProductVariantSnapshot Error Scenarios](./03-functional-requirements.md#productvariantsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariantSnapshot operations.
  - [91] [WishlistEntry Error Scenarios](./03-functional-requirements.md#wishlistentry-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all WishlistEntry operations.
  - [92] [CartItem Error Scenarios](./03-functional-requirements.md#cartitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CartItem operations.
  - [93] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [94] [OrderAddressSnapshot Error Scenarios](./03-functional-requirements.md#orderaddresssnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderAddressSnapshot operations.
  - [95] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItem operations.
  - [96] [ProductPurchaseSnapshot Error Scenarios](./03-functional-requirements.md#productpurchasesnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductPurchaseSnapshot operations.
  - [97] [SellerProfilePurchaseSnapshot Error Scenarios](./03-functional-requirements.md#sellerprofilepurchasesnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfilePurchaseSnapshot operations.
  - [98] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [99] [TrackingInfo Error Scenarios](./03-functional-requirements.md#trackinginfo-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all TrackingInfo operations.
  - [100] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [101] [CancellationRequestSnapshot Error Scenarios](./03-functional-requirements.md#cancellationrequestsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequestSnapshot operations.
  - [102] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequest operations.
  - [103] [RefundRequestSnapshot Error Scenarios](./03-functional-requirements.md#refundrequestsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequestSnapshot operations.
  - [104] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [105] [ReviewSnapshot Error Scenarios](./03-functional-requirements.md#reviewsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ReviewSnapshot operations.
  - [106] [PaymentAttempt Error Scenarios](./03-functional-requirements.md#paymentattempt-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all PaymentAttempt operations.
  - [107] [ProductSearchQuery Error Scenarios](./03-functional-requirements.md#productsearchquery-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductSearchQuery operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [108] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [109] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [110] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [111] [CustomerAccount Rules](./04-business-rules.md#customeraccount-rules) — Define validation rules and domain constraints for CustomerAccount. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [112] [CustomerProfile Rules](./04-business-rules.md#customerprofile-rules) — Define validation rules and domain constraints for CustomerProfile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [113] [ShippingAddress Rules](./04-business-rules.md#shippingaddress-rules) — Define validation rules and domain constraints for ShippingAddress. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [114] [SellerAccount Rules](./04-business-rules.md#selleraccount-rules) — Define validation rules and domain constraints for SellerAccount. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [115] [SellerApprovalRequest Rules](./04-business-rules.md#sellerapprovalrequest-rules) — Define validation rules and domain constraints for SellerApprovalRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [116] [SellerProfile Rules](./04-business-rules.md#sellerprofile-rules) — Define validation rules and domain constraints for SellerProfile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [117] [AdministratorAccount Rules](./04-business-rules.md#administratoraccount-rules) — Define validation rules and domain constraints for AdministratorAccount. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [118] [AdministratorRequest Rules](./04-business-rules.md#administratorrequest-rules) — Define validation rules and domain constraints for AdministratorRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [119] [Category Rules](./04-business-rules.md#category-rules) — Define validation rules and domain constraints for Category. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [120] [Product Rules](./04-business-rules.md#product-rules) — Define validation rules and domain constraints for Product. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [121] [ProductImage Rules](./04-business-rules.md#productimage-rules) — Define validation rules and domain constraints for ProductImage. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [122] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define validation rules and domain constraints for ProductVariant. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [123] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define validation rules and domain constraints for InventoryRecord. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [124] [ProductSnapshot Rules](./04-business-rules.md#productsnapshot-rules) — Define validation rules and domain constraints for ProductSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [125] [ProductVariantSnapshot Rules](./04-business-rules.md#productvariantsnapshot-rules) — Define validation rules and domain constraints for ProductVariantSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [126] [WishlistEntry Rules](./04-business-rules.md#wishlistentry-rules) — Define validation rules and domain constraints for WishlistEntry. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [127] [CartItem Rules](./04-business-rules.md#cartitem-rules) — Define validation rules and domain constraints for CartItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [128] [Order Rules](./04-business-rules.md#order-rules) — Define validation rules and domain constraints for Order. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [129] [OrderAddressSnapshot Rules](./04-business-rules.md#orderaddresssnapshot-rules) — Define validation rules and domain constraints for OrderAddressSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [130] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define validation rules and domain constraints for OrderItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [131] [ProductPurchaseSnapshot Rules](./04-business-rules.md#productpurchasesnapshot-rules) — Define validation rules and domain constraints for ProductPurchaseSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [132] [SellerProfilePurchaseSnapshot Rules](./04-business-rules.md#sellerprofilepurchasesnapshot-rules) — Define validation rules and domain constraints for SellerProfilePurchaseSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [133] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define validation rules and domain constraints for Shipment. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [134] [TrackingInfo Rules](./04-business-rules.md#trackinginfo-rules) — Define validation rules and domain constraints for TrackingInfo. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [135] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define validation rules and domain constraints for CancellationRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [136] [CancellationRequestSnapshot Rules](./04-business-rules.md#cancellationrequestsnapshot-rules) — Define validation rules and domain constraints for CancellationRequestSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [137] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define validation rules and domain constraints for RefundRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [138] [RefundRequestSnapshot Rules](./04-business-rules.md#refundrequestsnapshot-rules) — Define validation rules and domain constraints for RefundRequestSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [139] [Review Rules](./04-business-rules.md#review-rules) — Define validation rules and domain constraints for Review. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [140] [ReviewSnapshot Rules](./04-business-rules.md#reviewsnapshot-rules) — Define validation rules and domain constraints for ReviewSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [141] [PaymentAttempt Rules](./04-business-rules.md#paymentattempt-rules) — Define validation rules and domain constraints for PaymentAttempt. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [142] [ProductSearchQuery Rules](./04-business-rules.md#productsearchquery-rules) — Define validation rules and domain constraints for ProductSearchQuery. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [143] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [144] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [145] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [146] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [147] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [148] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [149] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [150] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **CustomerAccount** — has one CustomerProfile, has many ShippingAddress, has many Order, has many WishlistEntry, has many CartItem, has many Review, can submit one or more AdministratorRequest
- **CustomerProfile** — belongs to CustomerAccount
- **ShippingAddress** — belongs to CustomerAccount, can be copied into Order as an order-time shipping snapshot
- **SellerAccount** — has one SellerProfile, has many SellerApprovalRequest, has many Product, fulfills many OrderItem through Shipment, can submit one or more AdministratorRequest
- **SellerApprovalRequest** — belongs to SellerAccount, reviewed by AdministratorAccount
- **SellerProfile** — belongs to SellerAccount, visible to CustomerAccount, has many SellerProfileSnapshot, its purchase-time state can be preserved in OrderItem
- **AdministratorAccount** — reviews SellerApprovalRequest, reviews AdministratorRequest, manages Category, oversees Product, oversees Order
- **AdministratorRequest** — submitted by CustomerAccount or SellerAccount, reviewed by AdministratorAccount
- **Category** — may have one parent Category, may have many child Categories, has many Product
- **Product** — belongs to SellerAccount, belongs to Category or may become uncategorized, has many ProductImage, has many ProductVariant, has many ProductSnapshot, appears in many WishlistEntry, appears in search results and category listings, has many Review
- **ProductImage** — belongs to Product, included in ProductSnapshot
- **ProductVariant** — belongs to Product, has many InventoryRecord, has many ProductVariantSnapshot, can appear in CartItem, can appear in OrderItem
- **InventoryRecord** — belongs to ProductVariant, may be created by seller adjustment, order placement, cancellation approval, refund approval, or administrative action
- **ProductSnapshot** — belongs to Product, contains many ProductVariantSnapshot
- **ProductVariantSnapshot** — belongs to ProductVariant, may belong to ProductSnapshot, may be preserved in OrderItem as purchase-time state
- **WishlistEntry** — belongs to CustomerAccount, belongs to Product
- **CartItem** — belongs to CustomerAccount, references ProductVariant, references Product
- **Order** — belongs to CustomerAccount, has many OrderItem, has one OrderAddressSnapshot, has many Shipment
- **OrderAddressSnapshot** — belongs to Order
- **OrderItem** — belongs to Order, references SellerAccount for operational responsibility, references ProductVariant for inventory effects, has one ProductPurchaseSnapshot, has one SellerProfilePurchaseSnapshot, may belong to one Shipment, may have one CancellationRequest, may have one RefundRequest
- **ProductPurchaseSnapshot** — belongs to OrderItem
- **SellerProfilePurchaseSnapshot** — belongs to OrderItem
- **Shipment** — belongs to Order, belongs to SellerAccount, contains many OrderItem, has one TrackingInfo
- **TrackingInfo** — belongs to Shipment
- **CancellationRequest** — belongs to OrderItem, submitted by CustomerAccount, reviewed by SellerAccount or AdministratorAccount, has many CancellationRequestSnapshot
- **CancellationRequestSnapshot** — belongs to CancellationRequest
- **RefundRequest** — belongs to OrderItem, submitted by CustomerAccount, reviewed by SellerAccount or AdministratorAccount, has many RefundRequestSnapshot
- **RefundRequestSnapshot** — belongs to RefundRequest
- **Review** — belongs to CustomerAccount, belongs to Product, linked to Order and purchase context for eligibility, has many ReviewSnapshot
- **ReviewSnapshot** — belongs to Review
- **PaymentAttempt** — initiated by CustomerAccount, may result in one Order when successful
- **ProductSearchQuery** — returns many Product as search results

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