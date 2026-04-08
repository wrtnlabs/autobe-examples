### Table of Contents

**shoppingMall** is a backend service with the following actors and domain entities.

**Actors**: guest, member, seller, admin, superAdmin
**Entities**: Customer, Seller, Administrator, Category, Product, ProductVariant, ProductImage, InventoryRecord, Address, WishlistItem, Cart, CartItem, Order, OrderItem, Shipment, CancellationRequest, RefundRequest, Review, SellerApprovalRequest, AdminPromotionRequest, ProductSnapshot, ProductVariantSnapshot, SellerProfileSnapshot, ReviewSnapshot, OrderItemSnapshot, CancellationRequestSnapshot, RefundRequestSnapshot

---

**Scope**

- **Customer** — has many Addresses, has many WishlistItems, has one Cart, has many Orders, has many Reviews, has many CancellationRequests, has many RefundRequests
- **Seller** — has many Products, has many OrderItems, has one SellerApprovalRequest, has approvalStatus
- **Administrator** — can approve Sellers, can manage Categories, can manage Users
- **Category** — may have one parent Category, may have many child Categories, has many Products
- **Product** — belongs to Seller, belongs to Category, has many ProductImages, has many ProductVariants, has many WishlistItems, has many Reviews, has many ProductSnapshots
- **ProductVariant** — belongs to Product, has many InventoryRecords, has many CartItems, has many OrderItems, has many ProductVariantSnapshots
- **ProductImage** — belongs to Product
- **InventoryRecord** — belongs to ProductVariant
- **Address** — belongs to Customer, may be default Address
- **WishlistItem** — belongs to Customer, belongs to Product
- **Cart** — belongs to Customer, has many CartItems
- **CartItem** — belongs to Cart, belongs to ProductVariant
- **Order** — belongs to Customer, has many OrderItems, has many Shipments
- **OrderItem** — belongs to Order, belongs to Product, belongs to ProductVariant, belongs to Seller, has one Shipment, has one CancellationRequest, has one RefundRequest, has one OrderItemSnapshot
- **Shipment** — belongs to Order, has many OrderItems
- **CancellationRequest** — belongs to Customer, belongs to OrderItem, reviewed by Seller, has many CancellationRequestSnapshots
- **RefundRequest** — belongs to Customer, belongs to OrderItem, reviewed by Seller, has many RefundRequestSnapshots
- **Review** — belongs to Customer, belongs to Product, belongs to Order, has many ReviewSnapshots
- **SellerApprovalRequest** — belongs to Seller, reviewed by Administrator
- **AdminPromotionRequest** — belongs to Administrator, reviewed by SuperAdministrator
- **ProductSnapshot** — belongs to Product, has many ProductVariantSnapshots
- **ProductVariantSnapshot** — belongs to ProductVariant, belongs to ProductSnapshot
- **SellerProfileSnapshot** — belongs to Seller
- **ReviewSnapshot** — belongs to Review
- **OrderItemSnapshot** — belongs to OrderItem
- **CancellationRequestSnapshot** — belongs to CancellationRequest
- **RefundRequestSnapshot** — belongs to RefundRequest

- **guest** (guest)
- **member** (member)
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
  - [2] [member Actor](./01-actors-and-auth.md#member-actor) — Define the member actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
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
  - [11] [Administrator Concept](./02-domain-model.md#administrator-concept) — Describe what Administrator represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Category Concept](./02-domain-model.md#category-concept) — Describe what Category represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [ProductVariant Concept](./02-domain-model.md#productvariant-concept) — Describe what ProductVariant represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [ProductImage Concept](./02-domain-model.md#productimage-concept) — Describe what ProductImage represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [InventoryRecord Concept](./02-domain-model.md#inventoryrecord-concept) — Describe what InventoryRecord represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Address Concept](./02-domain-model.md#address-concept) — Describe what Address represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [WishlistItem Concept](./02-domain-model.md#wishlistitem-concept) — Describe what WishlistItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [Cart Concept](./02-domain-model.md#cart-concept) — Describe what Cart represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [CartItem Concept](./02-domain-model.md#cartitem-concept) — Describe what CartItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [21] [Order Concept](./02-domain-model.md#order-concept) — Describe what Order represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [22] [OrderItem Concept](./02-domain-model.md#orderitem-concept) — Describe what OrderItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [23] [Shipment Concept](./02-domain-model.md#shipment-concept) — Describe what Shipment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [24] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [25] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [26] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [27] [SellerApprovalRequest Concept](./02-domain-model.md#sellerapprovalrequest-concept) — Describe what SellerApprovalRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [28] [AdminPromotionRequest Concept](./02-domain-model.md#adminpromotionrequest-concept) — Describe what AdminPromotionRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [29] [ProductSnapshot Concept](./02-domain-model.md#productsnapshot-concept) — Describe what ProductSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [30] [ProductVariantSnapshot Concept](./02-domain-model.md#productvariantsnapshot-concept) — Describe what ProductVariantSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [31] [SellerProfileSnapshot Concept](./02-domain-model.md#sellerprofilesnapshot-concept) — Describe what SellerProfileSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [32] [ReviewSnapshot Concept](./02-domain-model.md#reviewsnapshot-concept) — Describe what ReviewSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [33] [OrderItemSnapshot Concept](./02-domain-model.md#orderitemsnapshot-concept) — Describe what OrderItemSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [34] [CancellationRequestSnapshot Concept](./02-domain-model.md#cancellationrequestsnapshot-concept) — Describe what CancellationRequestSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [35] [RefundRequestSnapshot Concept](./02-domain-model.md#refundrequestsnapshot-concept) — Describe what RefundRequestSnapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [36] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [37] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [38] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [39] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [40] [Customer Operations](./03-functional-requirements.md#customer-operations) — Define business operations for Customer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [Seller Operations](./03-functional-requirements.md#seller-operations) — Define business operations for Seller: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [Administrator Operations](./03-functional-requirements.md#administrator-operations) — Define business operations for Administrator: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [ProductImage Operations](./03-functional-requirements.md#productimage-operations) — Define business operations for ProductImage: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [Address Operations](./03-functional-requirements.md#address-operations) — Define business operations for Address: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [49] [WishlistItem Operations](./03-functional-requirements.md#wishlistitem-operations) — Define business operations for WishlistItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [50] [Cart Operations](./03-functional-requirements.md#cart-operations) — Define business operations for Cart: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [51] [CartItem Operations](./03-functional-requirements.md#cartitem-operations) — Define business operations for CartItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [52] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [53] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [54] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [55] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [56] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [57] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [58] [SellerApprovalRequest Operations](./03-functional-requirements.md#sellerapprovalrequest-operations) — Define business operations for SellerApprovalRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [59] [AdminPromotionRequest Operations](./03-functional-requirements.md#adminpromotionrequest-operations) — Define business operations for AdminPromotionRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [60] [ProductSnapshot Operations](./03-functional-requirements.md#productsnapshot-operations) — Define business operations for ProductSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [61] [ProductVariantSnapshot Operations](./03-functional-requirements.md#productvariantsnapshot-operations) — Define business operations for ProductVariantSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [62] [SellerProfileSnapshot Operations](./03-functional-requirements.md#sellerprofilesnapshot-operations) — Define business operations for SellerProfileSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [63] [ReviewSnapshot Operations](./03-functional-requirements.md#reviewsnapshot-operations) — Define business operations for ReviewSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [64] [OrderItemSnapshot Operations](./03-functional-requirements.md#orderitemsnapshot-operations) — Define business operations for OrderItemSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [65] [CancellationRequestSnapshot Operations](./03-functional-requirements.md#cancellationrequestsnapshot-operations) — Define business operations for CancellationRequestSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [66] [RefundRequestSnapshot Operations](./03-functional-requirements.md#refundrequestsnapshot-operations) — Define business operations for RefundRequestSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [67] [Customer Error Scenarios](./03-functional-requirements.md#customer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Customer operations.
  - [68] [Seller Error Scenarios](./03-functional-requirements.md#seller-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Seller operations.
  - [69] [Administrator Error Scenarios](./03-functional-requirements.md#administrator-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Administrator operations.
  - [70] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [71] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [72] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [73] [ProductImage Error Scenarios](./03-functional-requirements.md#productimage-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductImage operations.
  - [74] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [75] [Address Error Scenarios](./03-functional-requirements.md#address-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Address operations.
  - [76] [WishlistItem Error Scenarios](./03-functional-requirements.md#wishlistitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all WishlistItem operations.
  - [77] [Cart Error Scenarios](./03-functional-requirements.md#cart-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Cart operations.
  - [78] [CartItem Error Scenarios](./03-functional-requirements.md#cartitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CartItem operations.
  - [79] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [80] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItem operations.
  - [81] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [82] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [83] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequest operations.
  - [84] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [85] [SellerApprovalRequest Error Scenarios](./03-functional-requirements.md#sellerapprovalrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerApprovalRequest operations.
  - [86] [AdminPromotionRequest Error Scenarios](./03-functional-requirements.md#adminpromotionrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdminPromotionRequest operations.
  - [87] [ProductSnapshot Error Scenarios](./03-functional-requirements.md#productsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductSnapshot operations.
  - [88] [ProductVariantSnapshot Error Scenarios](./03-functional-requirements.md#productvariantsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariantSnapshot operations.
  - [89] [SellerProfileSnapshot Error Scenarios](./03-functional-requirements.md#sellerprofilesnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfileSnapshot operations.
  - [90] [ReviewSnapshot Error Scenarios](./03-functional-requirements.md#reviewsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ReviewSnapshot operations.
  - [91] [OrderItemSnapshot Error Scenarios](./03-functional-requirements.md#orderitemsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItemSnapshot operations.
  - [92] [CancellationRequestSnapshot Error Scenarios](./03-functional-requirements.md#cancellationrequestsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequestSnapshot operations.
  - [93] [RefundRequestSnapshot Error Scenarios](./03-functional-requirements.md#refundrequestsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequestSnapshot operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [94] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [95] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [96] [Customer Rules](./04-business-rules.md#customer-rules) — Define validation rules and domain constraints for Customer. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [97] [Seller Rules](./04-business-rules.md#seller-rules) — Define validation rules and domain constraints for Seller. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [98] [Administrator Rules](./04-business-rules.md#administrator-rules) — Define validation rules and domain constraints for Administrator. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [99] [Category Rules](./04-business-rules.md#category-rules) — Define validation rules and domain constraints for Category. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [100] [Product Rules](./04-business-rules.md#product-rules) — Define validation rules and domain constraints for Product. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [101] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define validation rules and domain constraints for ProductVariant. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [102] [ProductImage Rules](./04-business-rules.md#productimage-rules) — Define validation rules and domain constraints for ProductImage. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [103] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define validation rules and domain constraints for InventoryRecord. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [104] [Address Rules](./04-business-rules.md#address-rules) — Define validation rules and domain constraints for Address. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [105] [WishlistItem Rules](./04-business-rules.md#wishlistitem-rules) — Define validation rules and domain constraints for WishlistItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [106] [Cart Rules](./04-business-rules.md#cart-rules) — Define validation rules and domain constraints for Cart. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [107] [CartItem Rules](./04-business-rules.md#cartitem-rules) — Define validation rules and domain constraints for CartItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [108] [Order Rules](./04-business-rules.md#order-rules) — Define validation rules and domain constraints for Order. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [109] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define validation rules and domain constraints for OrderItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [110] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define validation rules and domain constraints for Shipment. Do NOT repeat data isolation (05), lifecycle (02), or operation flows (03).
  - [111] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define validation rules and domain constraints for CancellationRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [112] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define validation rules and domain constraints for RefundRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [113] [Review Rules](./04-business-rules.md#review-rules) — Define validation rules and domain constraints for Review. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [114] [SellerApprovalRequest Rules](./04-business-rules.md#sellerapprovalrequest-rules) — Define validation rules and domain constraints for SellerApprovalRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [115] [AdminPromotionRequest Rules](./04-business-rules.md#adminpromotionrequest-rules) — Define validation rules and domain constraints for AdminPromotionRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [116] [ProductSnapshot Rules](./04-business-rules.md#productsnapshot-rules) — Define validation rules and domain constraints for ProductSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [117] [ProductVariantSnapshot Rules](./04-business-rules.md#productvariantsnapshot-rules) — Define validation rules and domain constraints for ProductVariantSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [118] [SellerProfileSnapshot Rules](./04-business-rules.md#sellerprofilesnapshot-rules) — Define validation rules and domain constraints for SellerProfileSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [119] [ReviewSnapshot Rules](./04-business-rules.md#reviewsnapshot-rules) — Define validation rules and domain constraints for ReviewSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [120] [OrderItemSnapshot Rules](./04-business-rules.md#orderitemsnapshot-rules) — Define validation rules and domain constraints for OrderItemSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [121] [CancellationRequestSnapshot Rules](./04-business-rules.md#cancellationrequestsnapshot-rules) — Define validation rules and domain constraints for CancellationRequestSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [122] [RefundRequestSnapshot Rules](./04-business-rules.md#refundrequestsnapshot-rules) — Define validation rules and domain constraints for RefundRequestSnapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [123] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [124] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [125] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [126] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [127] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [128] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **Customer** — has many Addresses, has many WishlistItems, has one Cart, has many Orders, has many Reviews, has many CancellationRequests, has many RefundRequests
- **Seller** — has many Products, has many OrderItems, has one SellerApprovalRequest, has approvalStatus
- **Administrator** — can approve Sellers, can manage Categories, can manage Users
- **Category** — may have one parent Category, may have many child Categories, has many Products
- **Product** — belongs to Seller, belongs to Category, has many ProductImages, has many ProductVariants, has many WishlistItems, has many Reviews, has many ProductSnapshots
- **ProductVariant** — belongs to Product, has many InventoryRecords, has many CartItems, has many OrderItems, has many ProductVariantSnapshots
- **ProductImage** — belongs to Product
- **InventoryRecord** — belongs to ProductVariant
- **Address** — belongs to Customer, may be default Address
- **WishlistItem** — belongs to Customer, belongs to Product
- **Cart** — belongs to Customer, has many CartItems
- **CartItem** — belongs to Cart, belongs to ProductVariant
- **Order** — belongs to Customer, has many OrderItems, has many Shipments
- **OrderItem** — belongs to Order, belongs to Product, belongs to ProductVariant, belongs to Seller, has one Shipment, has one CancellationRequest, has one RefundRequest, has one OrderItemSnapshot
- **Shipment** — belongs to Order, has many OrderItems
- **CancellationRequest** — belongs to Customer, belongs to OrderItem, reviewed by Seller, has many CancellationRequestSnapshots
- **RefundRequest** — belongs to Customer, belongs to OrderItem, reviewed by Seller, has many RefundRequestSnapshots
- **Review** — belongs to Customer, belongs to Product, belongs to Order, has many ReviewSnapshots
- **SellerApprovalRequest** — belongs to Seller, reviewed by Administrator
- **AdminPromotionRequest** — belongs to Administrator, reviewed by SuperAdministrator
- **ProductSnapshot** — belongs to Product, has many ProductVariantSnapshots
- **ProductVariantSnapshot** — belongs to ProductVariant, belongs to ProductSnapshot
- **SellerProfileSnapshot** — belongs to Seller
- **ReviewSnapshot** — belongs to Review
- **OrderItemSnapshot** — belongs to OrderItem
- **CancellationRequestSnapshot** — belongs to CancellationRequest
- **RefundRequestSnapshot** — belongs to RefundRequest

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