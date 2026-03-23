### Table of Contents

**ecommerceMall** is a backend service with the following actors and domain entities.

**Actors**: customer, seller, admin
**Entities**: User, CustomerProfile, SellerProfile, Address, Category, Product, ProductImage, ProductVariant, ProductSnapshot, ProductSnapshotVariant, InventoryRecord, CartItem, WishlistItem, Order, OrderItem, Shipment, ShipmentItem, CancellationRequest, RefundRequest, Review, ReviewSnapshot, AdminRequest, AdminRole

---

**Scope**

- **User**: email: string, required, unique, password: string, required, role: string (customer|seller|admin), createdAt: datetime, updatedAt: datetime | Relationships: hasOne CustomerProfile via userId, hasOne SellerProfile via userId, hasMany Addresses via userId, hasMany Products via sellerId, hasMany Reviews via userId, hasMany WishlistItems via userId, hasMany CartItems via userId, hasMany OrderItems via customerId, hasMany CancellationRequests via customerId, hasMany RefundRequests via customerId, hasOne Customer Account if role=customer, hasOne Seller Account if role=seller
- **CustomerProfile**: userId: reference, required, displayName: string, required, phoneNumber: string, required, createdAt: datetime, updatedAt: datetime | Relationships: belongsTo User via userId, hasMany Addresses via profileId
- **SellerProfile**: userId: reference, required, shopName: string, required, shopDescription: text, optional, logoUrl: string, optional, approvalStatus: string (pending|approved|rejected), rejectionReason: text, optional, createdAt: datetime, updatedAt: datetime, isSuspended: boolean | Relationships: belongsTo User via userId, hasMany Products via sellerId, hasMany OrderItems via sellerId
- **Address**: userId: reference, required, profileId: reference, required, recipientName: string, required, phoneNumber: string, required, streetAddress: string, required, city: string, required, stateProvince: string, required, postalCode: string, required, country: string, required, isDefault: boolean, createdAt: datetime, updatedAt: datetime | Relationships: belongsTo User via userId, belongsTo CustomerProfile via profileId
- **Category**: name: string, required, description: text, optional, parentId: reference, optional, createdAt: datetime, updatedAt: datetime | Relationships: hasMany Subcategories via parentId, hasMany Products via categoryId
- **Product**: sellerId: reference, required, categoryId: reference, required, name: string, required, description: text, required, basePrice: decimal, required, isAvailable: boolean, createdAt: datetime, updatedAt: datetime, deletedAt: datetime, optional | Relationships: belongsTo SellerProfile via sellerId, belongsTo Category via categoryId, hasMany ProductImages via productId, hasMany ProductVariants via productId, hasMany OrderItems via productId, hasMany ProductSnapshots via productId
- **ProductImage**: productId: reference, required, imageUrl: string, required, sortOrder: integer, isMain: boolean, createdAt: datetime, updatedAt: datetime | Relationships: belongsTo Product via productId
- **ProductVariant**: productId: reference, required, skuCode: string, required, unique, optionValues: json, required (e.g., {color: 'Red', size: 'Large'}), priceOverride: decimal, optional, stockQuantity: integer, default 0, createdAt: datetime, updatedAt: datetime | Relationships: belongsTo Product via productId, hasMany InventoryRecords via variantId, hasMany OrderItems via variantId, hasMany ProductVariantSnapshots via variantId
- **ProductSnapshot**: productId: reference, required, sellerId: reference, required, categoryId: reference, required, snapshotType: string ('edit'|'order'|'refund'|'cancel'), name: string, required, description: text, required, basePrice: decimal, required, createdAt: datetime | Relationships: belongsTo Product via productId, belongsTo SellerProfile via sellerId, belongsTo Category via categoryId, hasMany ProductSnapshotVariants via snapshotId
- **ProductSnapshotVariant**: snapshotId: reference, required, skuCode: string, required, optionValues: json, required, priceOverride: decimal, optional, createdAt: datetime | Relationships: belongsTo ProductSnapshot via snapshotId
- **InventoryRecord**: variantId: reference, required, quantityChange: integer, required, reason: string, required (restock|order|adjustment|cancel|refund), referenceId: string, optional (orderId, etc.), createdAt: datetime | Relationships: belongsTo ProductVariant via variantId
- **CartItem**: userId: reference, required, variantId: reference, required, quantity: integer, required, min 1, createdAt: datetime, updatedAt: datetime | Relationships: belongsTo User via userId, belongsTo ProductVariant via variantId
- **WishlistItem**: userId: reference, required, productId: reference, required, createdAt: datetime | Relationships: belongsTo User via userId, belongsTo Product via productId
- **Order**: customerId: reference, required, shippingAddressId: reference, required, totalPrice: decimal, required, orderStatus: string (paid|shipped|delivered|cancelled|refunded|partiallyCompleted), createdAt: datetime, updatedAt: datetime | Relationships: belongsTo User via customerId, belongsTo Address via shippingAddressId, hasMany OrderItems via orderId, hasMany Shipments via orderId
- **OrderItem**: orderId: reference, required, productId: reference, required, variantId: reference, required, sellerId: reference, required, productName: string, required (snapshot), productDescription: text, required (snapshot), variantOptions: json, required (snapshot), productPrice: decimal, required (snapshot), quantity: integer, required, min 1, itemStatus: string (paid|shipped|delivered|cancelled|refunded), createdAt: datetime, updatedAt: datetime | Relationships: belongsTo Order via orderId, belongsTo Product via productId, belongsTo ProductVariant via variantId, belongsTo SellerProfile via sellerId, hasMany CancellationRequests via orderItemId, hasMany RefundRequests via orderItemId
- **Shipment**: orderId: reference, required, sellerId: reference, required, carrierName: string, optional, trackingNumber: string, optional, shipmentStatus: string (pending|shipped), createdAt: datetime, updatedAt: datetime | Relationships: belongsTo Order via orderId, belongsTo SellerProfile via sellerId, hasMany ShipmentItems via shipmentId
- **ShipmentItem**: shipmentId: reference, required, orderItemId: reference, required, createdAt: datetime | Relationships: belongsTo Shipment via shipmentId, belongsTo OrderItem via orderItemId
- **CancellationRequest**: orderItemId: reference, required, customerId: reference, required, sellerId: reference, required, reason: text, required, status: string (pending|approved|rejected), respondedAt: datetime, optional, snapshotData: json, optional, createdAt: datetime, updatedAt: datetime | Relationships: belongsTo OrderItem via orderItemId, belongsTo User via customerId, belongsTo SellerProfile via sellerId
- **RefundRequest**: orderItemId: reference, required, customerId: reference, required, sellerId: reference, required, reason: text, required, status: string (pending|approved|rejected), respondedAt: datetime, optional, snapshotData: json, optional, createdAt: datetime, updatedAt: datetime | Relationships: belongsTo OrderItem via orderItemId, belongsTo User via customerId, belongsTo SellerProfile via sellerId
- **Review**: customerId: reference, required, productId: reference, required, orderItemId: reference, required, rating: integer, required (1-5), textContent: text, optional, createdAt: datetime, updatedAt: datetime, deletedAt: datetime, optional | Relationships: belongsTo User via customerId, belongsTo Product via productId, belongsTo OrderItem via orderItemId, hasMany ReviewSnapshots via reviewId
- **ReviewSnapshot**: reviewId: reference, required, rating: integer, required, textContent: text, optional, snapshotType: string ('edit'), createdAt: datetime | Relationships: belongsTo Review via reviewId
- **AdminRequest**: userId: reference, required, reason: text, required, status: string (pending|approved|rejected), approvalNotes: text, optional, createdAt: datetime, updatedAt: datetime | Relationships: belongsTo User via userId
- **AdminRole**: userId: reference, required, grade: string (regular|super), createdAt: datetime, updatedAt: datetime | Relationships: belongsTo User via userId

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
  - [7] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain, its purpose, and how users interact with it.
  - [8] [CustomerProfile Concept](./02-domain-model.md#customerprofile-concept) — Describe what CustomerProfile represents in the business domain, its purpose, and how users interact with it.
  - [9] [SellerProfile Concept](./02-domain-model.md#sellerprofile-concept) — Describe what SellerProfile represents in the business domain, its purpose, and how users interact with it.
  - [10] [Address Concept](./02-domain-model.md#address-concept) — Describe what Address represents in the business domain, its purpose, and how users interact with it.
  - [11] [Category Concept](./02-domain-model.md#category-concept) — Describe what Category represents in the business domain, its purpose, and how users interact with it.
  - [12] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain, its purpose, and how users interact with it.
  - [13] [ProductImage Concept](./02-domain-model.md#productimage-concept) — Describe what ProductImage represents in the business domain, its purpose, and how users interact with it.
  - [14] [ProductVariant Concept](./02-domain-model.md#productvariant-concept) — Describe what ProductVariant represents in the business domain, its purpose, and how users interact with it.
  - [15] [ProductSnapshot Concept](./02-domain-model.md#productsnapshot-concept) — Describe what ProductSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [16] [ProductSnapshotVariant Concept](./02-domain-model.md#productsnapshotvariant-concept) — Describe what ProductSnapshotVariant represents in the business domain, its purpose, and how users interact with it.
  - [17] [InventoryRecord Concept](./02-domain-model.md#inventoryrecord-concept) — Describe what InventoryRecord represents in the business domain, its purpose, and how users interact with it.
  - [18] [CartItem Concept](./02-domain-model.md#cartitem-concept) — Describe what CartItem represents in the business domain, its purpose, and how users interact with it.
  - [19] [WishlistItem Concept](./02-domain-model.md#wishlistitem-concept) — Describe what WishlistItem represents in the business domain, its purpose, and how users interact with it.
  - [20] [Order Concept](./02-domain-model.md#order-concept) — Describe what Order represents in the business domain, its purpose, and how users interact with it.
  - [21] [OrderItem Concept](./02-domain-model.md#orderitem-concept) — Describe what OrderItem represents in the business domain, its purpose, and how users interact with it.
  - [22] [Shipment Concept](./02-domain-model.md#shipment-concept) — Describe what Shipment represents in the business domain, its purpose, and how users interact with it.
  - [23] [ShipmentItem Concept](./02-domain-model.md#shipmentitem-concept) — Describe what ShipmentItem represents in the business domain, its purpose, and how users interact with it.
  - [24] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain, its purpose, and how users interact with it.
  - [25] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain, its purpose, and how users interact with it.
  - [26] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain, its purpose, and how users interact with it.
  - [27] [ReviewSnapshot Concept](./02-domain-model.md#reviewsnapshot-concept) — Describe what ReviewSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [28] [AdminRequest Concept](./02-domain-model.md#adminrequest-concept) — Describe what AdminRequest represents in the business domain, its purpose, and how users interact with it.
  - [29] [AdminRole Concept](./02-domain-model.md#adminrole-concept) — Describe what AdminRole represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [30] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [31] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [32] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [33] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [34] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [35] [CustomerProfile Operations](./03-functional-requirements.md#customerprofile-operations) — Define business operations for CustomerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [SellerProfile Operations](./03-functional-requirements.md#sellerprofile-operations) — Define business operations for SellerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [Address Operations](./03-functional-requirements.md#address-operations) — Define business operations for Address: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [ProductImage Operations](./03-functional-requirements.md#productimage-operations) — Define business operations for ProductImage: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [ProductSnapshot Operations](./03-functional-requirements.md#productsnapshot-operations) — Define business operations for ProductSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [ProductSnapshotVariant Operations](./03-functional-requirements.md#productsnapshotvariant-operations) — Define business operations for ProductSnapshotVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [CartItem Operations](./03-functional-requirements.md#cartitem-operations) — Define business operations for CartItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [WishlistItem Operations](./03-functional-requirements.md#wishlistitem-operations) — Define business operations for WishlistItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [49] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [50] [ShipmentItem Operations](./03-functional-requirements.md#shipmentitem-operations) — Define business operations for ShipmentItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [51] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [52] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [53] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [54] [ReviewSnapshot Operations](./03-functional-requirements.md#reviewsnapshot-operations) — Define business operations for ReviewSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [55] [AdminRequest Operations](./03-functional-requirements.md#adminrequest-operations) — Define business operations for AdminRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [56] [AdminRole Operations](./03-functional-requirements.md#adminrole-operations) — Define business operations for AdminRole: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [57] [User Actions](./03-functional-requirements.md#user-actions) — Define business actions and workflows for the User domain group from a functional requirements perspective.
  - [58] [CustomerProfile Actions](./03-functional-requirements.md#customerprofile-actions) — Define business actions and workflows for the CustomerProfile domain group from a functional requirements perspective.
  - [59] [SellerProfile Actions](./03-functional-requirements.md#sellerprofile-actions) — Define business actions and workflows for the SellerProfile domain group from a functional requirements perspective.
  - [60] [Address Actions](./03-functional-requirements.md#address-actions) — Define business actions and workflows for the Address domain group from a functional requirements perspective.
  - [61] [Category Actions](./03-functional-requirements.md#category-actions) — Define business actions and workflows for the Category domain group from a functional requirements perspective.
  - [62] [Product Actions](./03-functional-requirements.md#product-actions) — Define business actions and workflows for the Product domain group from a functional requirements perspective.
  - [63] [ProductImage Actions](./03-functional-requirements.md#productimage-actions) — Define business actions and workflows for the ProductImage domain group from a functional requirements perspective.
  - [64] [ProductVariant Actions](./03-functional-requirements.md#productvariant-actions) — Define business actions and workflows for the ProductVariant domain group from a functional requirements perspective.
  - [65] [ProductSnapshot Actions](./03-functional-requirements.md#productsnapshot-actions) — Define business actions and workflows for the ProductSnapshot domain group from a functional requirements perspective.
  - [66] [ProductSnapshotVariant Actions](./03-functional-requirements.md#productsnapshotvariant-actions) — Define business actions and workflows for the ProductSnapshotVariant domain group from a functional requirements perspective.
  - [67] [InventoryRecord Actions](./03-functional-requirements.md#inventoryrecord-actions) — Define business actions and workflows for the InventoryRecord domain group from a functional requirements perspective.
  - [68] [CartItem Actions](./03-functional-requirements.md#cartitem-actions) — Define business actions and workflows for the CartItem domain group from a functional requirements perspective.
  - [69] [WishlistItem Actions](./03-functional-requirements.md#wishlistitem-actions) — Define business actions and workflows for the WishlistItem domain group from a functional requirements perspective.
  - [70] [Order Actions](./03-functional-requirements.md#order-actions) — Define business actions and workflows for the Order domain group from a functional requirements perspective.
  - [71] [OrderItem Actions](./03-functional-requirements.md#orderitem-actions) — Define business actions and workflows for the OrderItem domain group from a functional requirements perspective.
  - [72] [Shipment Actions](./03-functional-requirements.md#shipment-actions) — Define business actions and workflows for the Shipment domain group from a functional requirements perspective.
  - [73] [ShipmentItem Actions](./03-functional-requirements.md#shipmentitem-actions) — Define business actions and workflows for the ShipmentItem domain group from a functional requirements perspective.
  - [74] [CancellationRequest Actions](./03-functional-requirements.md#cancellationrequest-actions) — Define business actions and workflows for the CancellationRequest domain group from a functional requirements perspective.
  - [75] [RefundRequest Actions](./03-functional-requirements.md#refundrequest-actions) — Define business actions and workflows for the RefundRequest domain group from a functional requirements perspective.
  - [76] [Review Actions](./03-functional-requirements.md#review-actions) — Define business actions and workflows for the Review domain group from a functional requirements perspective.
  - [77] [ReviewSnapshot Actions](./03-functional-requirements.md#reviewsnapshot-actions) — Define business actions and workflows for the ReviewSnapshot domain group from a functional requirements perspective.
  - [78] [AdminRequest Actions](./03-functional-requirements.md#adminrequest-actions) — Define business actions and workflows for the AdminRequest domain group from a functional requirements perspective.
  - [79] [AdminRole Actions](./03-functional-requirements.md#adminrole-actions) — Define business actions and workflows for the AdminRole domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [80] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [81] [CustomerProfile Error Scenarios](./03-functional-requirements.md#customerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CustomerProfile operations.
  - [82] [SellerProfile Error Scenarios](./03-functional-requirements.md#sellerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfile operations.
  - [83] [Address Error Scenarios](./03-functional-requirements.md#address-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Address operations.
  - [84] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [85] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [86] [ProductImage Error Scenarios](./03-functional-requirements.md#productimage-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductImage operations.
  - [87] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [88] [ProductSnapshot Error Scenarios](./03-functional-requirements.md#productsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductSnapshot operations.
  - [89] [ProductSnapshotVariant Error Scenarios](./03-functional-requirements.md#productsnapshotvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductSnapshotVariant operations.
  - [90] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [91] [CartItem Error Scenarios](./03-functional-requirements.md#cartitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CartItem operations.
  - [92] [WishlistItem Error Scenarios](./03-functional-requirements.md#wishlistitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all WishlistItem operations.
  - [93] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [94] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItem operations.
  - [95] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [96] [ShipmentItem Error Scenarios](./03-functional-requirements.md#shipmentitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ShipmentItem operations.
  - [97] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [98] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequest operations.
  - [99] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [100] [ReviewSnapshot Error Scenarios](./03-functional-requirements.md#reviewsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ReviewSnapshot operations.
  - [101] [AdminRequest Error Scenarios](./03-functional-requirements.md#adminrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdminRequest operations.
  - [102] [AdminRole Error Scenarios](./03-functional-requirements.md#adminrole-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdminRole operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [103] [User User Scenarios](./03-functional-requirements.md#user-user-scenarios) — Define end-to-end user scenarios involving User and related concepts, describing business flows from the user's perspective.
  - [104] [CustomerProfile User Scenarios](./03-functional-requirements.md#customerprofile-user-scenarios) — Define end-to-end user scenarios involving CustomerProfile and related concepts, describing business flows from the user's perspective.
  - [105] [SellerProfile User Scenarios](./03-functional-requirements.md#sellerprofile-user-scenarios) — Define end-to-end user scenarios involving SellerProfile and related concepts, describing business flows from the user's perspective.
  - [106] [Address User Scenarios](./03-functional-requirements.md#address-user-scenarios) — Define end-to-end user scenarios involving Address and related concepts, describing business flows from the user's perspective.
  - [107] [Category User Scenarios](./03-functional-requirements.md#category-user-scenarios) — Define end-to-end user scenarios involving Category and related concepts, describing business flows from the user's perspective.
  - [108] [Product User Scenarios](./03-functional-requirements.md#product-user-scenarios) — Define end-to-end user scenarios involving Product and related concepts, describing business flows from the user's perspective.
  - [109] [ProductImage User Scenarios](./03-functional-requirements.md#productimage-user-scenarios) — Define end-to-end user scenarios involving ProductImage and related concepts, describing business flows from the user's perspective.
  - [110] [ProductVariant User Scenarios](./03-functional-requirements.md#productvariant-user-scenarios) — Define end-to-end user scenarios involving ProductVariant and related concepts, describing business flows from the user's perspective.
  - [111] [ProductSnapshot User Scenarios](./03-functional-requirements.md#productsnapshot-user-scenarios) — Define end-to-end user scenarios involving ProductSnapshot and related concepts, describing business flows from the user's perspective.
  - [112] [ProductSnapshotVariant User Scenarios](./03-functional-requirements.md#productsnapshotvariant-user-scenarios) — Define end-to-end user scenarios involving ProductSnapshotVariant and related concepts, describing business flows from the user's perspective.
  - [113] [InventoryRecord User Scenarios](./03-functional-requirements.md#inventoryrecord-user-scenarios) — Define end-to-end user scenarios involving InventoryRecord and related concepts, describing business flows from the user's perspective.
  - [114] [CartItem User Scenarios](./03-functional-requirements.md#cartitem-user-scenarios) — Define end-to-end user scenarios involving CartItem and related concepts, describing business flows from the user's perspective.
  - [115] [WishlistItem User Scenarios](./03-functional-requirements.md#wishlistitem-user-scenarios) — Define end-to-end user scenarios involving WishlistItem and related concepts, describing business flows from the user's perspective.
  - [116] [Order User Scenarios](./03-functional-requirements.md#order-user-scenarios) — Define end-to-end user scenarios involving Order and related concepts, describing business flows from the user's perspective.
  - [117] [OrderItem User Scenarios](./03-functional-requirements.md#orderitem-user-scenarios) — Define end-to-end user scenarios involving OrderItem and related concepts, describing business flows from the user's perspective.
  - [118] [Shipment User Scenarios](./03-functional-requirements.md#shipment-user-scenarios) — Define end-to-end user scenarios involving Shipment and related concepts, describing business flows from the user's perspective.
  - [119] [ShipmentItem User Scenarios](./03-functional-requirements.md#shipmentitem-user-scenarios) — Define end-to-end user scenarios involving ShipmentItem and related concepts, describing business flows from the user's perspective.
  - [120] [CancellationRequest User Scenarios](./03-functional-requirements.md#cancellationrequest-user-scenarios) — Define end-to-end user scenarios involving CancellationRequest and related concepts, describing business flows from the user's perspective.
  - [121] [RefundRequest User Scenarios](./03-functional-requirements.md#refundrequest-user-scenarios) — Define end-to-end user scenarios involving RefundRequest and related concepts, describing business flows from the user's perspective.
  - [122] [Review User Scenarios](./03-functional-requirements.md#review-user-scenarios) — Define end-to-end user scenarios involving Review and related concepts, describing business flows from the user's perspective.
  - [123] [ReviewSnapshot User Scenarios](./03-functional-requirements.md#reviewsnapshot-user-scenarios) — Define end-to-end user scenarios involving ReviewSnapshot and related concepts, describing business flows from the user's perspective.
  - [124] [AdminRequest User Scenarios](./03-functional-requirements.md#adminrequest-user-scenarios) — Define end-to-end user scenarios involving AdminRequest and related concepts, describing business flows from the user's perspective.
  - [125] [AdminRole User Scenarios](./03-functional-requirements.md#adminrole-user-scenarios) — Define end-to-end user scenarios involving AdminRole and related concepts, describing business flows from the user's perspective.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [126] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [127] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.
- [Background Processing](./03-functional-requirements.md#background-processing)
  - [128] [Job Specifications](./03-functional-requirements.md#job-specifications) — Define background jobs, queue configurations, retry policies, and scheduling rules for asynchronous processing.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [129] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [130] [User Rules](./04-business-rules.md#user-rules) — Define business rules, validation logic, and domain constraints for User.
  - [131] [CustomerProfile Rules](./04-business-rules.md#customerprofile-rules) — Define business rules, validation logic, and domain constraints for CustomerProfile.
  - [132] [SellerProfile Rules](./04-business-rules.md#sellerprofile-rules) — Define business rules, validation logic, and domain constraints for SellerProfile.
  - [133] [Address Rules](./04-business-rules.md#address-rules) — Define business rules, validation logic, and domain constraints for Address.
  - [134] [Category Rules](./04-business-rules.md#category-rules) — Define business rules, validation logic, and domain constraints for Category.
  - [135] [Product Rules](./04-business-rules.md#product-rules) — Define business rules, validation logic, and domain constraints for Product.
  - [136] [ProductImage Rules](./04-business-rules.md#productimage-rules) — Define business rules, validation logic, and domain constraints for ProductImage.
  - [137] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define business rules, validation logic, and domain constraints for ProductVariant.
  - [138] [ProductSnapshot Rules](./04-business-rules.md#productsnapshot-rules) — Define business rules, validation logic, and domain constraints for ProductSnapshot.
  - [139] [ProductSnapshotVariant Rules](./04-business-rules.md#productsnapshotvariant-rules) — Define business rules, validation logic, and domain constraints for ProductSnapshotVariant.
  - [140] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define business rules, validation logic, and domain constraints for InventoryRecord.
  - [141] [CartItem Rules](./04-business-rules.md#cartitem-rules) — Define business rules, validation logic, and domain constraints for CartItem.
  - [142] [WishlistItem Rules](./04-business-rules.md#wishlistitem-rules) — Define business rules, validation logic, and domain constraints for WishlistItem.
  - [143] [Order Rules](./04-business-rules.md#order-rules) — Define business rules, validation logic, and domain constraints for Order.
  - [144] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define business rules, validation logic, and domain constraints for OrderItem.
  - [145] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define business rules, validation logic, and domain constraints for Shipment.
  - [146] [ShipmentItem Rules](./04-business-rules.md#shipmentitem-rules) — Define business rules, validation logic, and domain constraints for ShipmentItem.
  - [147] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define business rules, validation logic, and domain constraints for CancellationRequest.
  - [148] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define business rules, validation logic, and domain constraints for RefundRequest.
  - [149] [Review Rules](./04-business-rules.md#review-rules) — Define business rules, validation logic, and domain constraints for Review.
  - [150] [ReviewSnapshot Rules](./04-business-rules.md#reviewsnapshot-rules) — Define business rules, validation logic, and domain constraints for ReviewSnapshot.
  - [151] [AdminRequest Rules](./04-business-rules.md#adminrequest-rules) — Define business rules, validation logic, and domain constraints for AdminRequest.
  - [152] [AdminRole Rules](./04-business-rules.md#adminrole-rules) — Define business rules, validation logic, and domain constraints for AdminRole.
- [Business Validation Criteria](./04-business-rules.md#business-validation-criteria)
  - [153] [User Validation Criteria](./04-business-rules.md#user-validation-criteria) — Define business validation expectations for User, including acceptable data quality criteria.
  - [154] [CustomerProfile Validation Criteria](./04-business-rules.md#customerprofile-validation-criteria) — Define business validation expectations for CustomerProfile, including acceptable data quality criteria.
  - [155] [SellerProfile Validation Criteria](./04-business-rules.md#sellerprofile-validation-criteria) — Define business validation expectations for SellerProfile, including acceptable data quality criteria.
  - [156] [Address Validation Criteria](./04-business-rules.md#address-validation-criteria) — Define business validation expectations for Address, including acceptable data quality criteria.
  - [157] [Category Validation Criteria](./04-business-rules.md#category-validation-criteria) — Define business validation expectations for Category, including acceptable data quality criteria.
  - [158] [Product Validation Criteria](./04-business-rules.md#product-validation-criteria) — Define business validation expectations for Product, including acceptable data quality criteria.
  - [159] [ProductImage Validation Criteria](./04-business-rules.md#productimage-validation-criteria) — Define business validation expectations for ProductImage, including acceptable data quality criteria.
  - [160] [ProductVariant Validation Criteria](./04-business-rules.md#productvariant-validation-criteria) — Define business validation expectations for ProductVariant, including acceptable data quality criteria.
  - [161] [ProductSnapshot Validation Criteria](./04-business-rules.md#productsnapshot-validation-criteria) — Define business validation expectations for ProductSnapshot, including acceptable data quality criteria.
  - [162] [ProductSnapshotVariant Validation Criteria](./04-business-rules.md#productsnapshotvariant-validation-criteria) — Define business validation expectations for ProductSnapshotVariant, including acceptable data quality criteria.
  - [163] [InventoryRecord Validation Criteria](./04-business-rules.md#inventoryrecord-validation-criteria) — Define business validation expectations for InventoryRecord, including acceptable data quality criteria.
  - [164] [CartItem Validation Criteria](./04-business-rules.md#cartitem-validation-criteria) — Define business validation expectations for CartItem, including acceptable data quality criteria.
  - [165] [WishlistItem Validation Criteria](./04-business-rules.md#wishlistitem-validation-criteria) — Define business validation expectations for WishlistItem, including acceptable data quality criteria.
  - [166] [Order Validation Criteria](./04-business-rules.md#order-validation-criteria) — Define business validation expectations for Order, including acceptable data quality criteria.
  - [167] [OrderItem Validation Criteria](./04-business-rules.md#orderitem-validation-criteria) — Define business validation expectations for OrderItem, including acceptable data quality criteria.
  - [168] [Shipment Validation Criteria](./04-business-rules.md#shipment-validation-criteria) — Define business validation expectations for Shipment, including acceptable data quality criteria.
  - [169] [ShipmentItem Validation Criteria](./04-business-rules.md#shipmentitem-validation-criteria) — Define business validation expectations for ShipmentItem, including acceptable data quality criteria.
  - [170] [CancellationRequest Validation Criteria](./04-business-rules.md#cancellationrequest-validation-criteria) — Define business validation expectations for CancellationRequest, including acceptable data quality criteria.
  - [171] [RefundRequest Validation Criteria](./04-business-rules.md#refundrequest-validation-criteria) — Define business validation expectations for RefundRequest, including acceptable data quality criteria.
  - [172] [Review Validation Criteria](./04-business-rules.md#review-validation-criteria) — Define business validation expectations for Review, including acceptable data quality criteria.
  - [173] [ReviewSnapshot Validation Criteria](./04-business-rules.md#reviewsnapshot-validation-criteria) — Define business validation expectations for ReviewSnapshot, including acceptable data quality criteria.
  - [174] [AdminRequest Validation Criteria](./04-business-rules.md#adminrequest-validation-criteria) — Define business validation expectations for AdminRequest, including acceptable data quality criteria.
  - [175] [AdminRole Validation Criteria](./04-business-rules.md#adminrole-validation-criteria) — Define business validation expectations for AdminRole, including acceptable data quality criteria.
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [176] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [177] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [178] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [179] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.
- [Job Failure Policies](./04-business-rules.md#job-failure-policies)
  - [180] [Job Failure and Recovery](./04-business-rules.md#job-failure-and-recovery) — Define failure handling, recovery procedures, and notification requirements for background jobs.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [181] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [182] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [183] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [184] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [185] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [186] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [187] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [188] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [189] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [190] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.
- [Queue Performance](./05-non-functional.md#queue-performance)
  - [191] [Queue Performance SLOs](./05-non-functional.md#queue-performance-slos) — Define performance requirements for background job processing.

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

- **User**: email: string, required, unique, password: string, required, role: string (customer|seller|admin), createdAt: datetime, updatedAt: datetime
- **CustomerProfile**: userId: reference, required, displayName: string, required, phoneNumber: string, required, createdAt: datetime, updatedAt: datetime
- **SellerProfile**: userId: reference, required, shopName: string, required, shopDescription: text, optional, logoUrl: string, optional, approvalStatus: string (pending|approved|rejected), rejectionReason: text, optional, createdAt: datetime, updatedAt: datetime, isSuspended: boolean
- **Address**: userId: reference, required, profileId: reference, required, recipientName: string, required, phoneNumber: string, required, streetAddress: string, required, city: string, required, stateProvince: string, required, postalCode: string, required, country: string, required, isDefault: boolean, createdAt: datetime, updatedAt: datetime
- **Category**: name: string, required, description: text, optional, parentId: reference, optional, createdAt: datetime, updatedAt: datetime
- **Product**: sellerId: reference, required, categoryId: reference, required, name: string, required, description: text, required, basePrice: decimal, required, isAvailable: boolean, createdAt: datetime, updatedAt: datetime, deletedAt: datetime, optional
- **ProductImage**: productId: reference, required, imageUrl: string, required, sortOrder: integer, isMain: boolean, createdAt: datetime, updatedAt: datetime
- **ProductVariant**: productId: reference, required, skuCode: string, required, unique, optionValues: json, required (e.g., {color: 'Red', size: 'Large'}), priceOverride: decimal, optional, stockQuantity: integer, default 0, createdAt: datetime, updatedAt: datetime
- **ProductSnapshot**: productId: reference, required, sellerId: reference, required, categoryId: reference, required, snapshotType: string ('edit'|'order'|'refund'|'cancel'), name: string, required, description: text, required, basePrice: decimal, required, createdAt: datetime
- **ProductSnapshotVariant**: snapshotId: reference, required, skuCode: string, required, optionValues: json, required, priceOverride: decimal, optional, createdAt: datetime
- **InventoryRecord**: variantId: reference, required, quantityChange: integer, required, reason: string, required (restock|order|adjustment|cancel|refund), referenceId: string, optional (orderId, etc.), createdAt: datetime
- **CartItem**: userId: reference, required, variantId: reference, required, quantity: integer, required, min 1, createdAt: datetime, updatedAt: datetime
- **WishlistItem**: userId: reference, required, productId: reference, required, createdAt: datetime
- **Order**: customerId: reference, required, shippingAddressId: reference, required, totalPrice: decimal, required, orderStatus: string (paid|shipped|delivered|cancelled|refunded|partiallyCompleted), createdAt: datetime, updatedAt: datetime
- **OrderItem**: orderId: reference, required, productId: reference, required, variantId: reference, required, sellerId: reference, required, productName: string, required (snapshot), productDescription: text, required (snapshot), variantOptions: json, required (snapshot), productPrice: decimal, required (snapshot), quantity: integer, required, min 1, itemStatus: string (paid|shipped|delivered|cancelled|refunded), createdAt: datetime, updatedAt: datetime
- **Shipment**: orderId: reference, required, sellerId: reference, required, carrierName: string, optional, trackingNumber: string, optional, shipmentStatus: string (pending|shipped), createdAt: datetime, updatedAt: datetime
- **ShipmentItem**: shipmentId: reference, required, orderItemId: reference, required, createdAt: datetime
- **CancellationRequest**: orderItemId: reference, required, customerId: reference, required, sellerId: reference, required, reason: text, required, status: string (pending|approved|rejected), respondedAt: datetime, optional, snapshotData: json, optional, createdAt: datetime, updatedAt: datetime
- **RefundRequest**: orderItemId: reference, required, customerId: reference, required, sellerId: reference, required, reason: text, required, status: string (pending|approved|rejected), respondedAt: datetime, optional, snapshotData: json, optional, createdAt: datetime, updatedAt: datetime
- **Review**: customerId: reference, required, productId: reference, required, orderItemId: reference, required, rating: integer, required (1-5), textContent: text, optional, createdAt: datetime, updatedAt: datetime, deletedAt: datetime, optional
- **ReviewSnapshot**: reviewId: reference, required, rating: integer, required, textContent: text, optional, snapshotType: string ('edit'), createdAt: datetime
- **AdminRequest**: userId: reference, required, reason: text, required, status: string (pending|approved|rejected), approvalNotes: text, optional, createdAt: datetime, updatedAt: datetime
- **AdminRole**: userId: reference, required, grade: string (regular|super), createdAt: datetime, updatedAt: datetime

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
- background-processing