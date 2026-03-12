### Table of Contents

**shoppingMall** is a backend service with the following actors and domain entities.

**Actors**: guest, customer, seller, admin
**Entities**: User, CustomerProfile, SellerProfile, AdministratorProfile, Address, Category, Product, ProductImage, ProductVariant, InventoryRecord, WishlistItem, CartItem, Order, OrderItem, Shipment, Review, CancellationRequest, RefundRequest, SellerApprovalRequest, AdminPromotionRequest, ProductSnapshot, VariantSnapshot, SellerProfileSnapshot, ReviewSnapshot, CancellationSnapshot, RefundSnapshot

---

**Scope**

- **User**: id: identifier, email: text(unique), passwordHash: text, createdAt: timestamp, deletedAt: timestamp(optional) | Relationships: hasOne CustomerProfile, hasOne SellerProfile(optional), hasOne AdministratorProfile(optional)
- **CustomerProfile**: userId: identifier, displayName: text, phoneNumber: text, createdAt: timestamp, updatedAt: timestamp | Relationships: belongsTo User, hasMany Address, hasMany WishlistItem, hasMany CartItem, hasMany Order
- **SellerProfile**: userId: identifier, shopName: text, shopDescription: text, logoImage: text, approvalStatus: enum(pending, approved, rejected, suspended), rejectionReason: text(optional), createdAt: timestamp, updatedAt: timestamp | Relationships: belongsTo User, hasMany Product, hasMany OrderItem(as seller)
- **AdministratorProfile**: userId: identifier, grade: enum(regular, super), createdAt: timestamp | Relationships: belongsTo User
- **Address**: customerId: identifier, recipientName: text, phoneNumber: text, streetAddress: text, city: text, stateProvince: text, postalCode: text, country: text, isDefault: boolean, createdAt: timestamp, updatedAt: timestamp | Relationships: belongsTo CustomerProfile
- **Category**: id: identifier, parentId: identifier(optional), name: text, description: text, createdAt: timestamp, updatedAt: timestamp | Relationships: hasMany Category(subcategories), hasMany Product
- **Product**: sellerId: identifier, categoryId: identifier, name: text, description: text, basePrice: number, createdAt: timestamp, updatedAt: timestamp, deletedAt: timestamp(optional) | Relationships: belongsTo SellerProfile, belongsTo Category, hasMany ProductVariant, hasMany ProductImage, hasMany ProductSnapshot
- **ProductImage**: productId: identifier, imageUrl: text, displayOrder: number, createdAt: timestamp | Relationships: belongsTo Product
- **ProductVariant**: productId: identifier, skuCode: text(unique), optionValues: text, priceOverride: number(optional), stockQuantity: number, createdAt: timestamp, updatedAt: timestamp | Relationships: belongsTo Product, hasMany InventoryRecord, hasMany VariantSnapshot
- **InventoryRecord**: variantId: identifier, quantityChange: number, reason: text, timestamp: timestamp | Relationships: belongsTo ProductVariant
- **WishlistItem**: customerId: identifier, productId: identifier, createdAt: timestamp | Relationships: belongsTo CustomerProfile, belongsTo Product
- **CartItem**: customerId: identifier, variantId: identifier, quantity: number | Relationships: belongsTo CustomerProfile, belongsTo ProductVariant
- **Order**: customerId: identifier, shippingAddressSnapshot: text, totalPrice: number, createdAt: timestamp | Relationships: belongsTo CustomerProfile, hasMany OrderItem
- **OrderItem**: orderId: identifier, productId: identifier, variantId: identifier, sellerId: identifier, productSnapshot: text, variantSnapshot: text, sellerProfileSnapshot: text, quantity: number, price: number, status: enum(paid, shipped, delivered, cancelled, refunded), createdAt: timestamp | Relationships: belongsTo Order, belongsTo Product, belongsTo ProductVariant, belongsTo SellerProfile, hasMany Shipment, hasMany CancellationRequest, hasMany RefundRequest, hasMany Review
- **Shipment**: sellerId: identifier, trackingCarrier: text, trackingNumber: text, shippedAt: timestamp, deliveredAt: timestamp(optional), deliveryConfirmed: boolean | Relationships: belongsTo SellerProfile, hasMany OrderItem
- **Review**: orderItemId: identifier, customerId: identifier, rating: number, textContent: text(optional), createdAt: timestamp, updatedAt: timestamp, deletedAt: timestamp(optional) | Relationships: belongsTo OrderItem, belongsTo CustomerProfile, hasMany ReviewSnapshot
- **CancellationRequest**: orderItemId: identifier, customerId: identifier, reason: text, status: enum(pending, approved, rejected), requestedAt: timestamp, respondedAt: timestamp(optional) | Relationships: belongsTo OrderItem, belongsTo CustomerProfile, hasMany CancellationSnapshot
- **RefundRequest**: orderItemId: identifier, customerId: identifier, reason: text, status: enum(pending, approved, rejected), requestedAt: timestamp, respondedAt: timestamp(optional) | Relationships: belongsTo OrderItem, belongsTo CustomerProfile, hasMany RefundSnapshot
- **SellerApprovalRequest**: sellerId: identifier, reason: text, status: enum(pending, approved, rejected), submittedAt: timestamp, respondedAt: timestamp(optional) | Relationships: belongsTo SellerProfile
- **AdminPromotionRequest**: userId: identifier, reason: text, status: enum(pending, approved, rejected), submittedAt: timestamp, respondedAt: timestamp(optional) | Relationships: belongsTo User
- **ProductSnapshot**: productId: identifier, snapshotData: text, createdAt: timestamp | Relationships: belongsTo Product, hasMany VariantSnapshot
- **VariantSnapshot**: productSnapshotId: identifier, variantId: identifier, snapshotData: text, createdAt: timestamp | Relationships: belongsTo ProductSnapshot, belongsTo ProductVariant
- **SellerProfileSnapshot**: sellerId: identifier, snapshotData: text, createdAt: timestamp | Relationships: belongsTo SellerProfile
- **ReviewSnapshot**: reviewId: identifier, snapshotData: text, createdAt: timestamp | Relationships: belongsTo Review
- **CancellationSnapshot**: cancellationRequestId: identifier, snapshotData: text, createdAt: timestamp | Relationships: belongsTo CancellationRequest
- **RefundSnapshot**: refundRequestId: identifier, snapshotData: text, createdAt: timestamp | Relationships: belongsTo RefundRequest

- **guest** (guest)
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
| [04-business-rules.md](./04-business-rules.md) | Data isolation, business rules, data browsing expectations, error scenarios | service-layer |
| [05-non-functional.md](./05-non-functional.md) | Performance SLOs, security policies, data integrity, storage requirements | test-infra |

**Section Navigation**

<!-- Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })` -->

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [guest Actor](./01-actors-and-auth.md#guest-actor) — Define the guest actor's role and capabilities in business terms.
  - [2] [customer Actor](./01-actors-and-auth.md#customer-actor) — Define the customer actor's role and capabilities in business terms.
  - [3] [seller Actor](./01-actors-and-auth.md#seller-actor) — Define the seller actor's role and capabilities in business terms.
  - [4] [admin Actor](./01-actors-and-auth.md#admin-actor) — Define the admin actor's role and capabilities in business terms.
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [5] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [6] [Session and Token Policy](./01-actors-and-auth.md#session-and-token-policy) — Define session duration, token refresh, and expiration policies.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [7] [Account States and Transitions](./01-actors-and-auth.md#account-states-and-transitions) — Define account states (active, suspended, deleted) and valid transitions.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [8] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain, its purpose, and how users interact with it.
  - [9] [CustomerProfile Concept](./02-domain-model.md#customerprofile-concept) — Describe what CustomerProfile represents in the business domain, its purpose, and how users interact with it.
  - [10] [SellerProfile Concept](./02-domain-model.md#sellerprofile-concept) — Describe what SellerProfile represents in the business domain, its purpose, and how users interact with it.
  - [11] [AdministratorProfile Concept](./02-domain-model.md#administratorprofile-concept) — Describe what AdministratorProfile represents in the business domain, its purpose, and how users interact with it.
  - [12] [Address Concept](./02-domain-model.md#address-concept) — Describe what Address represents in the business domain, its purpose, and how users interact with it.
  - [13] [Category Concept](./02-domain-model.md#category-concept) — Describe what Category represents in the business domain, its purpose, and how users interact with it.
  - [14] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain, its purpose, and how users interact with it.
  - [15] [ProductImage Concept](./02-domain-model.md#productimage-concept) — Describe what ProductImage represents in the business domain, its purpose, and how users interact with it.
  - [16] [ProductVariant Concept](./02-domain-model.md#productvariant-concept) — Describe what ProductVariant represents in the business domain, its purpose, and how users interact with it.
  - [17] [InventoryRecord Concept](./02-domain-model.md#inventoryrecord-concept) — Describe what InventoryRecord represents in the business domain, its purpose, and how users interact with it.
  - [18] [WishlistItem Concept](./02-domain-model.md#wishlistitem-concept) — Describe what WishlistItem represents in the business domain, its purpose, and how users interact with it.
  - [19] [CartItem Concept](./02-domain-model.md#cartitem-concept) — Describe what CartItem represents in the business domain, its purpose, and how users interact with it.
  - [20] [Order Concept](./02-domain-model.md#order-concept) — Describe what Order represents in the business domain, its purpose, and how users interact with it.
  - [21] [OrderItem Concept](./02-domain-model.md#orderitem-concept) — Describe what OrderItem represents in the business domain, its purpose, and how users interact with it.
  - [22] [Shipment Concept](./02-domain-model.md#shipment-concept) — Describe what Shipment represents in the business domain, its purpose, and how users interact with it.
  - [23] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain, its purpose, and how users interact with it.
  - [24] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain, its purpose, and how users interact with it.
  - [25] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain, its purpose, and how users interact with it.
  - [26] [SellerApprovalRequest Concept](./02-domain-model.md#sellerapprovalrequest-concept) — Describe what SellerApprovalRequest represents in the business domain, its purpose, and how users interact with it.
  - [27] [AdminPromotionRequest Concept](./02-domain-model.md#adminpromotionrequest-concept) — Describe what AdminPromotionRequest represents in the business domain, its purpose, and how users interact with it.
  - [28] [ProductSnapshot Concept](./02-domain-model.md#productsnapshot-concept) — Describe what ProductSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [29] [VariantSnapshot Concept](./02-domain-model.md#variantsnapshot-concept) — Describe what VariantSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [30] [SellerProfileSnapshot Concept](./02-domain-model.md#sellerprofilesnapshot-concept) — Describe what SellerProfileSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [31] [ReviewSnapshot Concept](./02-domain-model.md#reviewsnapshot-concept) — Describe what ReviewSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [32] [CancellationSnapshot Concept](./02-domain-model.md#cancellationsnapshot-concept) — Describe what CancellationSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [33] [RefundSnapshot Concept](./02-domain-model.md#refundsnapshot-concept) — Describe what RefundSnapshot represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [34] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [35] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [36] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [37] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [38] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [CustomerProfile Operations](./03-functional-requirements.md#customerprofile-operations) — Define business operations for CustomerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [SellerProfile Operations](./03-functional-requirements.md#sellerprofile-operations) — Define business operations for SellerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [AdministratorProfile Operations](./03-functional-requirements.md#administratorprofile-operations) — Define business operations for AdministratorProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [Address Operations](./03-functional-requirements.md#address-operations) — Define business operations for Address: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [ProductImage Operations](./03-functional-requirements.md#productimage-operations) — Define business operations for ProductImage: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [WishlistItem Operations](./03-functional-requirements.md#wishlistitem-operations) — Define business operations for WishlistItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [49] [CartItem Operations](./03-functional-requirements.md#cartitem-operations) — Define business operations for CartItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [50] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [51] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [52] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [53] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [54] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [55] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [56] [SellerApprovalRequest Operations](./03-functional-requirements.md#sellerapprovalrequest-operations) — Define business operations for SellerApprovalRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [57] [AdminPromotionRequest Operations](./03-functional-requirements.md#adminpromotionrequest-operations) — Define business operations for AdminPromotionRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [58] [ProductSnapshot Operations](./03-functional-requirements.md#productsnapshot-operations) — Define business operations for ProductSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [59] [VariantSnapshot Operations](./03-functional-requirements.md#variantsnapshot-operations) — Define business operations for VariantSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [60] [SellerProfileSnapshot Operations](./03-functional-requirements.md#sellerprofilesnapshot-operations) — Define business operations for SellerProfileSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [61] [ReviewSnapshot Operations](./03-functional-requirements.md#reviewsnapshot-operations) — Define business operations for ReviewSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [62] [CancellationSnapshot Operations](./03-functional-requirements.md#cancellationsnapshot-operations) — Define business operations for CancellationSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [63] [RefundSnapshot Operations](./03-functional-requirements.md#refundsnapshot-operations) — Define business operations for RefundSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [64] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective.
  - [65] [CustomerProfile Actions](./03-functional-requirements.md#customerprofile-actions) — Define business actions and workflows for the CustomerProfile domain group from a functional requirements perspective.
  - [66] [SellerProfile Actions](./03-functional-requirements.md#sellerprofile-actions) — Define business actions and workflows for the SellerProfile domain group from a functional requirements perspective.
  - [67] [AdministratorProfile Actions](./03-functional-requirements.md#administratorprofile-actions) — Define business actions and workflows for the AdministratorProfile domain group from a functional requirements perspective.
  - [68] [Address Actions](./03-functional-requirements.md#address-actions) — Define business actions and workflows for the Address domain group from a functional requirements perspective.
  - [69] [Category Actions](./03-functional-requirements.md#category-actions) — Define business actions and workflows for the Category domain group from a functional requirements perspective.
  - [70] [Product Actions](./03-functional-requirements.md#product-actions) — Define business actions and workflows for the Product domain group from a functional requirements perspective.
  - [71] [ProductImage Actions](./03-functional-requirements.md#productimage-actions) — Define business actions and workflows for the ProductImage domain group from a functional requirements perspective.
  - [72] [ProductVariant Actions](./03-functional-requirements.md#productvariant-actions) — Define business actions and workflows for the ProductVariant domain group from a functional requirements perspective.
  - [73] [InventoryRecord Actions](./03-functional-requirements.md#inventoryrecord-actions) — Define business actions and workflows for the InventoryRecord domain group from a functional requirements perspective.
  - [74] [WishlistItem Actions](./03-functional-requirements.md#wishlistitem-actions) — Define business actions and workflows for the WishlistItem domain group from a functional requirements perspective.
  - [75] [CartItem Actions](./03-functional-requirements.md#cartitem-actions) — Define business actions and workflows for the CartItem domain group from a functional requirements perspective.
  - [76] [Order Actions](./03-functional-requirements.md#order-actions) — Define business actions and workflows for the Order domain group from a functional requirements perspective.
  - [77] [OrderItem Actions](./03-functional-requirements.md#orderitem-actions) — Define business actions and workflows for the OrderItem domain group from a functional requirements perspective.
  - [78] [Shipment Actions](./03-functional-requirements.md#shipment-actions) — Define business actions and workflows for the Shipment domain group from a functional requirements perspective.
  - [79] [Review Actions](./03-functional-requirements.md#review-actions) — Define business actions and workflows for the Review domain group from a functional requirements perspective.
  - [80] [CancellationRequest Actions](./03-functional-requirements.md#cancellationrequest-actions) — Define business actions and workflows for the CancellationRequest domain group from a functional requirements perspective.
  - [81] [RefundRequest Actions](./03-functional-requirements.md#refundrequest-actions) — Define business actions and workflows for the RefundRequest domain group from a functional requirements perspective.
  - [82] [SellerApprovalRequest Actions](./03-functional-requirements.md#sellerapprovalrequest-actions) — Define business actions and workflows for the SellerApprovalRequest domain group from a functional requirements perspective.
  - [83] [AdminPromotionRequest Actions](./03-functional-requirements.md#adminpromotionrequest-actions) — Define business actions and workflows for the AdminPromotionRequest domain group from a functional requirements perspective.
  - [84] [ProductSnapshot Actions](./03-functional-requirements.md#productsnapshot-actions) — Define business actions and workflows for the ProductSnapshot domain group from a functional requirements perspective.
  - [85] [VariantSnapshot Actions](./03-functional-requirements.md#variantsnapshot-actions) — Define business actions and workflows for the VariantSnapshot domain group from a functional requirements perspective.
  - [86] [SellerProfileSnapshot Actions](./03-functional-requirements.md#sellerprofilesnapshot-actions) — Define business actions and workflows for the SellerProfileSnapshot domain group from a functional requirements perspective.
  - [87] [ReviewSnapshot Actions](./03-functional-requirements.md#reviewsnapshot-actions) — Define business actions and workflows for the ReviewSnapshot domain group from a functional requirements perspective.
  - [88] [CancellationSnapshot Actions](./03-functional-requirements.md#cancellationsnapshot-actions) — Define business actions and workflows for the CancellationSnapshot domain group from a functional requirements perspective.
  - [89] [RefundSnapshot Actions](./03-functional-requirements.md#refundsnapshot-actions) — Define business actions and workflows for the RefundSnapshot domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [90] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [91] [CustomerProfile Error Scenarios](./03-functional-requirements.md#customerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CustomerProfile operations.
  - [92] [SellerProfile Error Scenarios](./03-functional-requirements.md#sellerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfile operations.
  - [93] [AdministratorProfile Error Scenarios](./03-functional-requirements.md#administratorprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdministratorProfile operations.
  - [94] [Address Error Scenarios](./03-functional-requirements.md#address-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Address operations.
  - [95] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [96] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [97] [ProductImage Error Scenarios](./03-functional-requirements.md#productimage-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductImage operations.
  - [98] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [99] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [100] [WishlistItem Error Scenarios](./03-functional-requirements.md#wishlistitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all WishlistItem operations.
  - [101] [CartItem Error Scenarios](./03-functional-requirements.md#cartitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CartItem operations.
  - [102] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [103] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItem operations.
  - [104] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [105] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [106] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [107] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequest operations.
  - [108] [SellerApprovalRequest Error Scenarios](./03-functional-requirements.md#sellerapprovalrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerApprovalRequest operations.
  - [109] [AdminPromotionRequest Error Scenarios](./03-functional-requirements.md#adminpromotionrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdminPromotionRequest operations.
  - [110] [ProductSnapshot Error Scenarios](./03-functional-requirements.md#productsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductSnapshot operations.
  - [111] [VariantSnapshot Error Scenarios](./03-functional-requirements.md#variantsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all VariantSnapshot operations.
  - [112] [SellerProfileSnapshot Error Scenarios](./03-functional-requirements.md#sellerprofilesnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfileSnapshot operations.
  - [113] [ReviewSnapshot Error Scenarios](./03-functional-requirements.md#reviewsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ReviewSnapshot operations.
  - [114] [CancellationSnapshot Error Scenarios](./03-functional-requirements.md#cancellationsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationSnapshot operations.
  - [115] [RefundSnapshot Error Scenarios](./03-functional-requirements.md#refundsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundSnapshot operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [116] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective.
  - [117] [CustomerProfile User Scenarios](./03-functional-requirements.md#customerprofile-user-scenarios) — Define end-to-end user scenarios involving CustomerProfile and related concepts, describing business flows from the user's perspective.
  - [118] [SellerProfile User Scenarios](./03-functional-requirements.md#sellerprofile-user-scenarios) — Define end-to-end user scenarios involving SellerProfile and related concepts, describing business flows from the user's perspective.
  - [119] [AdministratorProfile User Scenarios](./03-functional-requirements.md#administratorprofile-user-scenarios) — Define end-to-end user scenarios involving AdministratorProfile and related concepts, describing business flows from the user's perspective.
  - [120] [Address User Scenarios](./03-functional-requirements.md#address-user-scenarios) — Define end-to-end user scenarios involving Address and related concepts, describing business flows from the user's perspective.
  - [121] [Category User Scenarios](./03-functional-requirements.md#category-user-scenarios) — Define end-to-end user scenarios involving Category and related concepts, describing business flows from the user's perspective.
  - [122] [Product User Scenarios](./03-functional-requirements.md#product-user-scenarios) — Define end-to-end user scenarios involving Product and related concepts, describing business flows from the user's perspective.
  - [123] [ProductImage User Scenarios](./03-functional-requirements.md#productimage-user-scenarios) — Define end-to-end user scenarios involving ProductImage and related concepts, describing business flows from the user's perspective.
  - [124] [ProductVariant User Scenarios](./03-functional-requirements.md#productvariant-user-scenarios) — Define end-to-end user scenarios involving ProductVariant and related concepts, describing business flows from the user's perspective.
  - [125] [InventoryRecord User Scenarios](./03-functional-requirements.md#inventoryrecord-user-scenarios) — Define end-to-end user scenarios involving InventoryRecord and related concepts, describing business flows from the user's perspective.
  - [126] [WishlistItem User Scenarios](./03-functional-requirements.md#wishlistitem-user-scenarios) — Define end-to-end user scenarios involving WishlistItem and related concepts, describing business flows from the user's perspective.
  - [127] [CartItem User Scenarios](./03-functional-requirements.md#cartitem-user-scenarios) — Define end-to-end user scenarios involving CartItem and related concepts, describing business flows from the user's perspective.
  - [128] [Order User Scenarios](./03-functional-requirements.md#order-user-scenarios) — Define end-to-end user scenarios involving Order and related concepts, describing business flows from the user's perspective.
  - [129] [OrderItem User Scenarios](./03-functional-requirements.md#orderitem-user-scenarios) — Define end-to-end user scenarios involving OrderItem and related concepts, describing business flows from the user's perspective.
  - [130] [Shipment User Scenarios](./03-functional-requirements.md#shipment-user-scenarios) — Define end-to-end user scenarios involving Shipment and related concepts, describing business flows from the user's perspective.
  - [131] [Review User Scenarios](./03-functional-requirements.md#review-user-scenarios) — Define end-to-end user scenarios involving Review and related concepts, describing business flows from the user's perspective.
  - [132] [CancellationRequest User Scenarios](./03-functional-requirements.md#cancellationrequest-user-scenarios) — Define end-to-end user scenarios involving CancellationRequest and related concepts, describing business flows from the user's perspective.
  - [133] [RefundRequest User Scenarios](./03-functional-requirements.md#refundrequest-user-scenarios) — Define end-to-end user scenarios involving RefundRequest and related concepts, describing business flows from the user's perspective.
  - [134] [SellerApprovalRequest User Scenarios](./03-functional-requirements.md#sellerapprovalrequest-user-scenarios) — Define end-to-end user scenarios involving SellerApprovalRequest and related concepts, describing business flows from the user's perspective.
  - [135] [AdminPromotionRequest User Scenarios](./03-functional-requirements.md#adminpromotionrequest-user-scenarios) — Define end-to-end user scenarios involving AdminPromotionRequest and related concepts, describing business flows from the user's perspective.
  - [136] [ProductSnapshot User Scenarios](./03-functional-requirements.md#productsnapshot-user-scenarios) — Define end-to-end user scenarios involving ProductSnapshot and related concepts, describing business flows from the user's perspective.
  - [137] [VariantSnapshot User Scenarios](./03-functional-requirements.md#variantsnapshot-user-scenarios) — Define end-to-end user scenarios involving VariantSnapshot and related concepts, describing business flows from the user's perspective.
  - [138] [SellerProfileSnapshot User Scenarios](./03-functional-requirements.md#sellerprofilesnapshot-user-scenarios) — Define end-to-end user scenarios involving SellerProfileSnapshot and related concepts, describing business flows from the user's perspective.
  - [139] [ReviewSnapshot User Scenarios](./03-functional-requirements.md#reviewsnapshot-user-scenarios) — Define end-to-end user scenarios involving ReviewSnapshot and related concepts, describing business flows from the user's perspective.
  - [140] [CancellationSnapshot User Scenarios](./03-functional-requirements.md#cancellationsnapshot-user-scenarios) — Define end-to-end user scenarios involving CancellationSnapshot and related concepts, describing business flows from the user's perspective.
  - [141] [RefundSnapshot User Scenarios](./03-functional-requirements.md#refundsnapshot-user-scenarios) — Define end-to-end user scenarios involving RefundSnapshot and related concepts, describing business flows from the user's perspective.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [142] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [143] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [144] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [145] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User.
  - [146] [CustomerProfile Rules](./04-business-rules.md#customerprofile-rules) — Define business rules, validation logic, and domain constraints for CustomerProfile.
  - [147] [SellerProfile Rules](./04-business-rules.md#sellerprofile-rules) — Define business rules, validation logic, and domain constraints for SellerProfile.
  - [148] [AdministratorProfile Rules](./04-business-rules.md#administratorprofile-rules) — Define business rules, validation logic, and domain constraints for AdministratorProfile.
  - [149] [Address Rules](./04-business-rules.md#address-rules) — Define business rules, validation logic, and domain constraints for Address.
  - [150] [Category Rules](./04-business-rules.md#category-rules) — Define business rules, validation logic, and domain constraints for Category.
  - [151] [Product Rules](./04-business-rules.md#product-rules) — Define business rules, validation logic, and domain constraints for Product.
  - [152] [ProductImage Rules](./04-business-rules.md#productimage-rules) — Define business rules, validation logic, and domain constraints for ProductImage.
  - [153] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define business rules, validation logic, and domain constraints for ProductVariant.
  - [154] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define business rules, validation logic, and domain constraints for InventoryRecord.
  - [155] [WishlistItem Rules](./04-business-rules.md#wishlistitem-rules) — Define business rules, validation logic, and domain constraints for WishlistItem.
  - [156] [CartItem Rules](./04-business-rules.md#cartitem-rules) — Define business rules, validation logic, and domain constraints for CartItem.
  - [157] [Order Rules](./04-business-rules.md#order-rules) — Define business rules, validation logic, and domain constraints for Order.
  - [158] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define business rules, validation logic, and domain constraints for OrderItem.
  - [159] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define business rules, validation logic, and domain constraints for Shipment.
  - [160] [Review Rules](./04-business-rules.md#review-rules) — Define business rules, validation logic, and domain constraints for Review.
  - [161] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define business rules, validation logic, and domain constraints for CancellationRequest.
  - [162] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define business rules, validation logic, and domain constraints for RefundRequest.
  - [163] [SellerApprovalRequest Rules](./04-business-rules.md#sellerapprovalrequest-rules) — Define business rules, validation logic, and domain constraints for SellerApprovalRequest.
  - [164] [AdminPromotionRequest Rules](./04-business-rules.md#adminpromotionrequest-rules) — Define business rules, validation logic, and domain constraints for AdminPromotionRequest.
  - [165] [ProductSnapshot Rules](./04-business-rules.md#productsnapshot-rules) — Define business rules, validation logic, and domain constraints for ProductSnapshot.
  - [166] [VariantSnapshot Rules](./04-business-rules.md#variantsnapshot-rules) — Define business rules, validation logic, and domain constraints for VariantSnapshot.
  - [167] [SellerProfileSnapshot Rules](./04-business-rules.md#sellerprofilesnapshot-rules) — Define business rules, validation logic, and domain constraints for SellerProfileSnapshot.
  - [168] [ReviewSnapshot Rules](./04-business-rules.md#reviewsnapshot-rules) — Define business rules, validation logic, and domain constraints for ReviewSnapshot.
  - [169] [CancellationSnapshot Rules](./04-business-rules.md#cancellationsnapshot-rules) — Define business rules, validation logic, and domain constraints for CancellationSnapshot.
  - [170] [RefundSnapshot Rules](./04-business-rules.md#refundsnapshot-rules) — Define business rules, validation logic, and domain constraints for RefundSnapshot.
- [Business Validation Criteria](./04-business-rules.md#business-validation-criteria)
  - [171] [User Validation Criteria](./04-business-rules.md#user-validation-criteria) — Define business validation expectations for User, including acceptable data quality criteria.
  - [172] [CustomerProfile Validation Criteria](./04-business-rules.md#customerprofile-validation-criteria) — Define business validation expectations for CustomerProfile, including acceptable data quality criteria.
  - [173] [SellerProfile Validation Criteria](./04-business-rules.md#sellerprofile-validation-criteria) — Define business validation expectations for SellerProfile, including acceptable data quality criteria.
  - [174] [AdministratorProfile Validation Criteria](./04-business-rules.md#administratorprofile-validation-criteria) — Define business validation expectations for AdministratorProfile, including acceptable data quality criteria.
  - [175] [Address Validation Criteria](./04-business-rules.md#address-validation-criteria) — Define business validation expectations for Address, including acceptable data quality criteria.
  - [176] [Category Validation Criteria](./04-business-rules.md#category-validation-criteria) — Define business validation expectations for Category, including acceptable data quality criteria.
  - [177] [Product Validation Criteria](./04-business-rules.md#product-validation-criteria) — Define business validation expectations for Product, including acceptable data quality criteria.
  - [178] [ProductImage Validation Criteria](./04-business-rules.md#productimage-validation-criteria) — Define business validation expectations for ProductImage, including acceptable data quality criteria.
  - [179] [ProductVariant Validation Criteria](./04-business-rules.md#productvariant-validation-criteria) — Define business validation expectations for ProductVariant, including acceptable data quality criteria.
  - [180] [InventoryRecord Validation Criteria](./04-business-rules.md#inventoryrecord-validation-criteria) — Define business validation expectations for InventoryRecord, including acceptable data quality criteria.
  - [181] [WishlistItem Validation Criteria](./04-business-rules.md#wishlistitem-validation-criteria) — Define business validation expectations for WishlistItem, including acceptable data quality criteria.
  - [182] [CartItem Validation Criteria](./04-business-rules.md#cartitem-validation-criteria) — Define business validation expectations for CartItem, including acceptable data quality criteria.
  - [183] [Order Validation Criteria](./04-business-rules.md#order-validation-criteria) — Define business validation expectations for Order, including acceptable data quality criteria.
  - [184] [OrderItem Validation Criteria](./04-business-rules.md#orderitem-validation-criteria) — Define business validation expectations for OrderItem, including acceptable data quality criteria.
  - [185] [Shipment Validation Criteria](./04-business-rules.md#shipment-validation-criteria) — Define business validation expectations for Shipment, including acceptable data quality criteria.
  - [186] [Review Validation Criteria](./04-business-rules.md#review-validation-criteria) — Define business validation expectations for Review, including acceptable data quality criteria.
  - [187] [CancellationRequest Validation Criteria](./04-business-rules.md#cancellationrequest-validation-criteria) — Define business validation expectations for CancellationRequest, including acceptable data quality criteria.
  - [188] [RefundRequest Validation Criteria](./04-business-rules.md#refundrequest-validation-criteria) — Define business validation expectations for RefundRequest, including acceptable data quality criteria.
  - [189] [SellerApprovalRequest Validation Criteria](./04-business-rules.md#sellerapprovalrequest-validation-criteria) — Define business validation expectations for SellerApprovalRequest, including acceptable data quality criteria.
  - [190] [AdminPromotionRequest Validation Criteria](./04-business-rules.md#adminpromotionrequest-validation-criteria) — Define business validation expectations for AdminPromotionRequest, including acceptable data quality criteria.
  - [191] [ProductSnapshot Validation Criteria](./04-business-rules.md#productsnapshot-validation-criteria) — Define business validation expectations for ProductSnapshot, including acceptable data quality criteria.
  - [192] [VariantSnapshot Validation Criteria](./04-business-rules.md#variantsnapshot-validation-criteria) — Define business validation expectations for VariantSnapshot, including acceptable data quality criteria.
  - [193] [SellerProfileSnapshot Validation Criteria](./04-business-rules.md#sellerprofilesnapshot-validation-criteria) — Define business validation expectations for SellerProfileSnapshot, including acceptable data quality criteria.
  - [194] [ReviewSnapshot Validation Criteria](./04-business-rules.md#reviewsnapshot-validation-criteria) — Define business validation expectations for ReviewSnapshot, including acceptable data quality criteria.
  - [195] [CancellationSnapshot Validation Criteria](./04-business-rules.md#cancellationsnapshot-validation-criteria) — Define business validation expectations for CancellationSnapshot, including acceptable data quality criteria.
  - [196] [RefundSnapshot Validation Criteria](./04-business-rules.md#refundsnapshot-validation-criteria) — Define business validation expectations for RefundSnapshot, including acceptable data quality criteria.
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [197] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [198] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [199] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [200] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [201] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [202] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [203] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [204] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [205] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [206] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [207] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [208] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [209] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [210] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **User**: id: identifier, email: text(unique), passwordHash: text, createdAt: timestamp, deletedAt: timestamp(optional)
- **CustomerProfile**: userId: identifier, displayName: text, phoneNumber: text, createdAt: timestamp, updatedAt: timestamp
- **SellerProfile**: userId: identifier, shopName: text, shopDescription: text, logoImage: text, approvalStatus: enum(pending, approved, rejected, suspended), rejectionReason: text(optional), createdAt: timestamp, updatedAt: timestamp
- **AdministratorProfile**: userId: identifier, grade: enum(regular, super), createdAt: timestamp
- **Address**: customerId: identifier, recipientName: text, phoneNumber: text, streetAddress: text, city: text, stateProvince: text, postalCode: text, country: text, isDefault: boolean, createdAt: timestamp, updatedAt: timestamp
- **Category**: id: identifier, parentId: identifier(optional), name: text, description: text, createdAt: timestamp, updatedAt: timestamp
- **Product**: sellerId: identifier, categoryId: identifier, name: text, description: text, basePrice: number, createdAt: timestamp, updatedAt: timestamp, deletedAt: timestamp(optional)
- **ProductImage**: productId: identifier, imageUrl: text, displayOrder: number, createdAt: timestamp
- **ProductVariant**: productId: identifier, skuCode: text(unique), optionValues: text, priceOverride: number(optional), stockQuantity: number, createdAt: timestamp, updatedAt: timestamp
- **InventoryRecord**: variantId: identifier, quantityChange: number, reason: text, timestamp: timestamp
- **WishlistItem**: customerId: identifier, productId: identifier, createdAt: timestamp
- **CartItem**: customerId: identifier, variantId: identifier, quantity: number
- **Order**: customerId: identifier, shippingAddressSnapshot: text, totalPrice: number, createdAt: timestamp
- **OrderItem**: orderId: identifier, productId: identifier, variantId: identifier, sellerId: identifier, productSnapshot: text, variantSnapshot: text, sellerProfileSnapshot: text, quantity: number, price: number, status: enum(paid, shipped, delivered, cancelled, refunded), createdAt: timestamp
- **Shipment**: sellerId: identifier, trackingCarrier: text, trackingNumber: text, shippedAt: timestamp, deliveredAt: timestamp(optional), deliveryConfirmed: boolean
- **Review**: orderItemId: identifier, customerId: identifier, rating: number, textContent: text(optional), createdAt: timestamp, updatedAt: timestamp, deletedAt: timestamp(optional)
- **CancellationRequest**: orderItemId: identifier, customerId: identifier, reason: text, status: enum(pending, approved, rejected), requestedAt: timestamp, respondedAt: timestamp(optional)
- **RefundRequest**: orderItemId: identifier, customerId: identifier, reason: text, status: enum(pending, approved, rejected), requestedAt: timestamp, respondedAt: timestamp(optional)
- **SellerApprovalRequest**: sellerId: identifier, reason: text, status: enum(pending, approved, rejected), submittedAt: timestamp, respondedAt: timestamp(optional)
- **AdminPromotionRequest**: userId: identifier, reason: text, status: enum(pending, approved, rejected), submittedAt: timestamp, respondedAt: timestamp(optional)
- **ProductSnapshot**: productId: identifier, snapshotData: text, createdAt: timestamp
- **VariantSnapshot**: productSnapshotId: identifier, variantId: identifier, snapshotData: text, createdAt: timestamp
- **SellerProfileSnapshot**: sellerId: identifier, snapshotData: text, createdAt: timestamp
- **ReviewSnapshot**: reviewId: identifier, snapshotData: text, createdAt: timestamp
- **CancellationSnapshot**: cancellationRequestId: identifier, snapshotData: text, createdAt: timestamp
- **RefundSnapshot**: refundRequestId: identifier, snapshotData: text, createdAt: timestamp

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

**Active Features**

- external-integration
- file-storage