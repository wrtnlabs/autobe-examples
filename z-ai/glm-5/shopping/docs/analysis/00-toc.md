### Table of Contents

**shoppingMall** is a backend service with the following actors and domain entities.

**Actors**: customer, seller, administrator
**Entities**: Customer, Seller, Administrator, AdministratorRequest, Category, Product, ProductImage, ProductVariant, ProductSnapshot, InventoryRecord, Cart, CartItem, Wishlist, Order, OrderItem, OrderItemSnapshot, SellerProfileSnapshot, Shipment, CancellationRequest, CancellationRequestSnapshot, RefundRequest, RefundRequestSnapshot, Review, ReviewSnapshot, Address

---

**Scope**

- **Customer**: email: string, required, unique, password: string, required, displayName: string, phoneNumber: string, banned: boolean, default false | Relationships: has many Addresses, has one Cart, has many Wishlists, has many Orders, has many Reviews
- **Seller**: email: string, required, unique, password: string, required, shopName: string, required, shopDescription: text, logoImage: string (URL), approvalStatus: enum (pending/approved/rejected), rejectionReason: text, suspended: boolean, default false, banned: boolean, default false | Relationships: has many Products, has many OrderItems (as seller), has many SellerProfileSnapshots
- **Administrator**: email: string, required, unique, password: string, required, grade: enum (regular/super) | Relationships: creates/approves Categories, approves/rejects Sellers, handles AdministratorRequests
- **AdministratorRequest**: reason: text, required, status: enum (pending/approved/rejected), reviewedAt: datetime, reviewedBy: Administrator reference | Relationships: belongs to Customer or Seller (requester)
- **Category**: name: string, required, description: text, parentId: Category reference (for subcategories) | Relationships: parent Category (optional, one level only), has many Products
- **Product**: name: string, required, description: text, required, basePrice: decimal, required, categoryId: Category reference, required | Relationships: belongs to Seller, belongs to Category, has many ProductImages, has many ProductVariants, has many ProductSnapshots, has many Wishlists, has many Reviews
- **ProductImage**: imageUrl: string, required, displayOrder: integer, createdAt: datetime | Relationships: belongs to Product
- **ProductVariant**: skuCode: string, required, unique, optionValues: json (e.g., color, size), price: decimal (overrides base price), stockQuantity: integer, calculated from InventoryRecords | Relationships: belongs to Product, has many InventoryRecords, has many ProductSnapshotSKUs, has many CartItems, has many OrderItems
- **ProductSnapshot**: name: string, description: text, basePrice: decimal, images: json array, createdAt: datetime | Relationships: belongs to Product, has many ProductSnapshotSKUs (variant snapshots)
- **InventoryRecord**: quantityChange: integer (positive for restock, negative for orders), reason: text, required, createdAt: datetime, required | Relationships: belongs to ProductVariant
- **Cart**: createdAt: datetime, updatedAt: datetime | Relationships: belongs to Customer (one-to-one), has many CartItems
- **CartItem**: quantity: integer, required, createdAt: datetime | Relationships: belongs to Cart, belongs to ProductVariant
- **Wishlist**: createdAt: datetime | Relationships: belongs to Customer, belongs to Product
- **Order**: orderNumber: string, unique, required, totalPrice: decimal, required, status: enum (paid/shipped/delivered/cancelled/refunded/partially_completed), shippingAddress: json, required, createdAt: datetime | Relationships: belongs to Customer, has many OrderItems, has many Shipments
- **OrderItem**: quantity: integer, required, price: decimal, required, status: enum (paid/shipped/delivered/cancelled/refunded) | Relationships: belongs to Order, belongs to Product, belongs to ProductVariant, belongs to Seller, has one OrderItemSnapshot, has one CancellationRequest (optional), has one RefundRequest (optional), belongs to Shipment (optional, when shipped)
- **OrderItemSnapshot**: productName: string, productDescription: text, variantOptions: json, price: decimal, sellerShopName: string, sellerLogoImage: string, createdAt: datetime | Relationships: belongs to OrderItem
- **SellerProfileSnapshot**: shopName: string, shopDescription: text, logoImage: string, createdAt: datetime | Relationships: belongs to Seller
- **Shipment**: carrierName: string, required, trackingNumber: string, required, shippedAt: datetime, required, deliveredAt: datetime (confirmed or auto after 14 days) | Relationships: belongs to Seller, belongs to Order, has many OrderItems
- **CancellationRequest**: reason: text, required, status: enum (pending/approved/rejected), createdAt: datetime, respondedAt: datetime | Relationships: belongs to OrderItem, belongs to Seller (respondent), has many CancellationRequestSnapshots
- **CancellationRequestSnapshot**: reason: text, status: enum, createdAt: datetime | Relationships: belongs to CancellationRequest
- **RefundRequest**: reason: text, required, status: enum (pending/approved/rejected), createdAt: datetime, respondedAt: datetime | Relationships: belongs to OrderItem, belongs to Seller (respondent), has many RefundRequestSnapshots
- **RefundRequestSnapshot**: reason: text, status: enum, createdAt: datetime | Relationships: belongs to RefundRequest
- **Review**: rating: integer (1-5), required, content: text, createdAt: datetime, deletedAt: datetime (soft delete) | Relationships: belongs to Customer, belongs to Product, belongs to Order, has many ReviewSnapshots
- **ReviewSnapshot**: rating: integer, content: text, createdAt: datetime | Relationships: belongs to Review
- **Address**: recipientName: string, required, phoneNumber: string, required, streetAddress: string, required, city: string, required, stateProvince: string, required, postalCode: string, required, country: string, required, isDefault: boolean, default false | Relationships: belongs to Customer

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
| [04-business-rules.md](./04-business-rules.md) | Data isolation, business rules, filtering/sorting/pagination, error catalog | service-layer |
| [05-non-functional.md](./05-non-functional.md) | Performance SLOs, security policies, data integrity, storage requirements | test-infra |

**Section Navigation**

<!-- Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })` -->

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [customer Actor](./01-actors-and-auth.md#customer-actor) — Define the customer actor's role and capabilities in business terms.
  - [2] [seller Actor](./01-actors-and-auth.md#seller-actor) — Define the seller actor's role and capabilities in business terms.
  - [3] [administrator Actor](./01-actors-and-auth.md#administrator-actor) — Define the administrator actor's role and capabilities in business terms.
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [4] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [5] [Session and Token Policy](./01-actors-and-auth.md#session-and-token-policy) — Define session duration, token refresh, and expiration policies.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [6] [Account States and Transitions](./01-actors-and-auth.md#account-states-and-transitions) — Define account states (active, suspended, deleted) and valid transitions.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [7] [Customer Concept](./02-domain-model.md#customer-concept) — Describe what Customer represents in the business domain, its purpose, and how users interact with it.
  - [8] [Seller Concept](./02-domain-model.md#seller-concept) — Describe what Seller represents in the business domain, its purpose, and how users interact with it.
  - [9] [Administrator Concept](./02-domain-model.md#administrator-concept) — Describe what Administrator represents in the business domain, its purpose, and how users interact with it.
  - [10] [AdministratorRequest Concept](./02-domain-model.md#administratorrequest-concept) — Describe what AdministratorRequest represents in the business domain, its purpose, and how users interact with it.
  - [11] [Category Concept](./02-domain-model.md#category-concept) — Describe what Category represents in the business domain, its purpose, and how users interact with it.
  - [12] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain, its purpose, and how users interact with it.
  - [13] [ProductImage Concept](./02-domain-model.md#productimage-concept) — Describe what ProductImage represents in the business domain, its purpose, and how users interact with it.
  - [14] [ProductVariant Concept](./02-domain-model.md#productvariant-concept) — Describe what ProductVariant represents in the business domain, its purpose, and how users interact with it.
  - [15] [ProductSnapshot Concept](./02-domain-model.md#productsnapshot-concept) — Describe what ProductSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [16] [InventoryRecord Concept](./02-domain-model.md#inventoryrecord-concept) — Describe what InventoryRecord represents in the business domain, its purpose, and how users interact with it.
  - [17] [Cart Concept](./02-domain-model.md#cart-concept) — Describe what Cart represents in the business domain, its purpose, and how users interact with it.
  - [18] [CartItem Concept](./02-domain-model.md#cartitem-concept) — Describe what CartItem represents in the business domain, its purpose, and how users interact with it.
  - [19] [Wishlist Concept](./02-domain-model.md#wishlist-concept) — Describe what Wishlist represents in the business domain, its purpose, and how users interact with it.
  - [20] [Order Concept](./02-domain-model.md#order-concept) — Describe what Order represents in the business domain, its purpose, and how users interact with it.
  - [21] [OrderItem Concept](./02-domain-model.md#orderitem-concept) — Describe what OrderItem represents in the business domain, its purpose, and how users interact with it.
  - [22] [OrderItemSnapshot Concept](./02-domain-model.md#orderitemsnapshot-concept) — Describe what OrderItemSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [23] [SellerProfileSnapshot Concept](./02-domain-model.md#sellerprofilesnapshot-concept) — Describe what SellerProfileSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [24] [Shipment Concept](./02-domain-model.md#shipment-concept) — Describe what Shipment represents in the business domain, its purpose, and how users interact with it.
  - [25] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain, its purpose, and how users interact with it.
  - [26] [CancellationRequestSnapshot Concept](./02-domain-model.md#cancellationrequestsnapshot-concept) — Describe what CancellationRequestSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [27] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain, its purpose, and how users interact with it.
  - [28] [RefundRequestSnapshot Concept](./02-domain-model.md#refundrequestsnapshot-concept) — Describe what RefundRequestSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [29] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain, its purpose, and how users interact with it.
  - [30] [ReviewSnapshot Concept](./02-domain-model.md#reviewsnapshot-concept) — Describe what ReviewSnapshot represents in the business domain, its purpose, and how users interact with it.
  - [31] [Address Concept](./02-domain-model.md#address-concept) — Describe what Address represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [32] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [33] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Enums and State Machines](./02-domain-model.md#enums-and-state-machines)
  - [34] [Enum Definitions](./02-domain-model.md#enum-definitions) — Define all enum types with their allowed values and descriptions.
  - [35] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [36] [Customer Operations](./03-functional-requirements.md#customer-operations) — Define business operations for Customer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [Seller Operations](./03-functional-requirements.md#seller-operations) — Define business operations for Seller: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [Administrator Operations](./03-functional-requirements.md#administrator-operations) — Define business operations for Administrator: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [AdministratorRequest Operations](./03-functional-requirements.md#administratorrequest-operations) — Define business operations for AdministratorRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [ProductImage Operations](./03-functional-requirements.md#productimage-operations) — Define business operations for ProductImage: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [ProductSnapshot Operations](./03-functional-requirements.md#productsnapshot-operations) — Define business operations for ProductSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [Cart Operations](./03-functional-requirements.md#cart-operations) — Define business operations for Cart: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [CartItem Operations](./03-functional-requirements.md#cartitem-operations) — Define business operations for CartItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [Wishlist Operations](./03-functional-requirements.md#wishlist-operations) — Define business operations for Wishlist: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [49] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [50] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [51] [OrderItemSnapshot Operations](./03-functional-requirements.md#orderitemsnapshot-operations) — Define business operations for OrderItemSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [52] [SellerProfileSnapshot Operations](./03-functional-requirements.md#sellerprofilesnapshot-operations) — Define business operations for SellerProfileSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [53] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [54] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [55] [CancellationRequestSnapshot Operations](./03-functional-requirements.md#cancellationrequestsnapshot-operations) — Define business operations for CancellationRequestSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [56] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [57] [RefundRequestSnapshot Operations](./03-functional-requirements.md#refundrequestsnapshot-operations) — Define business operations for RefundRequestSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [58] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [59] [ReviewSnapshot Operations](./03-functional-requirements.md#reviewsnapshot-operations) — Define business operations for ReviewSnapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [60] [Address Operations](./03-functional-requirements.md#address-operations) — Define business operations for Address: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [61] [Customer Actions](./03-functional-requirements.md#customer-actions) — Define business actions and workflows for the Customer domain group from a functional requirements perspective.
  - [62] [Seller Actions](./03-functional-requirements.md#seller-actions) — Define business actions and workflows for the Seller domain group from a functional requirements perspective.
  - [63] [Administrator Actions](./03-functional-requirements.md#administrator-actions) — Define business actions and workflows for the Administrator domain group from a functional requirements perspective.
  - [64] [AdministratorRequest Actions](./03-functional-requirements.md#administratorrequest-actions) — Define business actions and workflows for the AdministratorRequest domain group from a functional requirements perspective.
  - [65] [Category Actions](./03-functional-requirements.md#category-actions) — Define business actions and workflows for the Category domain group from a functional requirements perspective.
  - [66] [Product Actions](./03-functional-requirements.md#product-actions) — Define business actions and workflows for the Product domain group from a functional requirements perspective.
  - [67] [ProductImage Actions](./03-functional-requirements.md#productimage-actions) — Define business actions and workflows for the ProductImage domain group from a functional requirements perspective.
  - [68] [ProductVariant Actions](./03-functional-requirements.md#productvariant-actions) — Define business actions and workflows for the ProductVariant domain group from a functional requirements perspective.
  - [69] [ProductSnapshot Actions](./03-functional-requirements.md#productsnapshot-actions) — Define business actions and workflows for the ProductSnapshot domain group from a functional requirements perspective.
  - [70] [InventoryRecord Actions](./03-functional-requirements.md#inventoryrecord-actions) — Define business actions and workflows for the InventoryRecord domain group from a functional requirements perspective.
  - [71] [Cart Actions](./03-functional-requirements.md#cart-actions) — Define business actions and workflows for the Cart domain group from a functional requirements perspective.
  - [72] [CartItem Actions](./03-functional-requirements.md#cartitem-actions) — Define business actions and workflows for the CartItem domain group from a functional requirements perspective.
  - [73] [Wishlist Actions](./03-functional-requirements.md#wishlist-actions) — Define business actions and workflows for the Wishlist domain group from a functional requirements perspective.
  - [74] [Order Actions](./03-functional-requirements.md#order-actions) — Define business actions and workflows for the Order domain group from a functional requirements perspective.
  - [75] [OrderItem Actions](./03-functional-requirements.md#orderitem-actions) — Define business actions and workflows for the OrderItem domain group from a functional requirements perspective.
  - [76] [OrderItemSnapshot Actions](./03-functional-requirements.md#orderitemsnapshot-actions) — Define business actions and workflows for the OrderItemSnapshot domain group from a functional requirements perspective.
  - [77] [SellerProfileSnapshot Actions](./03-functional-requirements.md#sellerprofilesnapshot-actions) — Define business actions and workflows for the SellerProfileSnapshot domain group from a functional requirements perspective.
  - [78] [Shipment Actions](./03-functional-requirements.md#shipment-actions) — Define business actions and workflows for the Shipment domain group from a functional requirements perspective.
  - [79] [CancellationRequest Actions](./03-functional-requirements.md#cancellationrequest-actions) — Define business actions and workflows for the CancellationRequest domain group from a functional requirements perspective.
  - [80] [CancellationRequestSnapshot Actions](./03-functional-requirements.md#cancellationrequestsnapshot-actions) — Define business actions and workflows for the CancellationRequestSnapshot domain group from a functional requirements perspective.
  - [81] [RefundRequest Actions](./03-functional-requirements.md#refundrequest-actions) — Define business actions and workflows for the RefundRequest domain group from a functional requirements perspective.
  - [82] [RefundRequestSnapshot Actions](./03-functional-requirements.md#refundrequestsnapshot-actions) — Define business actions and workflows for the RefundRequestSnapshot domain group from a functional requirements perspective.
  - [83] [Review Actions](./03-functional-requirements.md#review-actions) — Define business actions and workflows for the Review domain group from a functional requirements perspective.
  - [84] [ReviewSnapshot Actions](./03-functional-requirements.md#reviewsnapshot-actions) — Define business actions and workflows for the ReviewSnapshot domain group from a functional requirements perspective.
  - [85] [Address Actions](./03-functional-requirements.md#address-actions) — Define business actions and workflows for the Address domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [86] [Customer Error Scenarios](./03-functional-requirements.md#customer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Customer operations.
  - [87] [Seller Error Scenarios](./03-functional-requirements.md#seller-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Seller operations.
  - [88] [Administrator Error Scenarios](./03-functional-requirements.md#administrator-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Administrator operations.
  - [89] [AdministratorRequest Error Scenarios](./03-functional-requirements.md#administratorrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdministratorRequest operations.
  - [90] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [91] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [92] [ProductImage Error Scenarios](./03-functional-requirements.md#productimage-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductImage operations.
  - [93] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [94] [ProductSnapshot Error Scenarios](./03-functional-requirements.md#productsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductSnapshot operations.
  - [95] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [96] [Cart Error Scenarios](./03-functional-requirements.md#cart-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Cart operations.
  - [97] [CartItem Error Scenarios](./03-functional-requirements.md#cartitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CartItem operations.
  - [98] [Wishlist Error Scenarios](./03-functional-requirements.md#wishlist-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Wishlist operations.
  - [99] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [100] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItem operations.
  - [101] [OrderItemSnapshot Error Scenarios](./03-functional-requirements.md#orderitemsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItemSnapshot operations.
  - [102] [SellerProfileSnapshot Error Scenarios](./03-functional-requirements.md#sellerprofilesnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfileSnapshot operations.
  - [103] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [104] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [105] [CancellationRequestSnapshot Error Scenarios](./03-functional-requirements.md#cancellationrequestsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequestSnapshot operations.
  - [106] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequest operations.
  - [107] [RefundRequestSnapshot Error Scenarios](./03-functional-requirements.md#refundrequestsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequestSnapshot operations.
  - [108] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [109] [ReviewSnapshot Error Scenarios](./03-functional-requirements.md#reviewsnapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ReviewSnapshot operations.
  - [110] [Address Error Scenarios](./03-functional-requirements.md#address-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Address operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [111] [Customer User Scenarios](./03-functional-requirements.md#customer-user-scenarios) — Define end-to-end user scenarios involving Customer and related concepts, describing business flows from the user's perspective.
  - [112] [Seller User Scenarios](./03-functional-requirements.md#seller-user-scenarios) — Define end-to-end user scenarios involving Seller and related concepts, describing business flows from the user's perspective.
  - [113] [Administrator User Scenarios](./03-functional-requirements.md#administrator-user-scenarios) — Define end-to-end user scenarios involving Administrator and related concepts, describing business flows from the user's perspective.
  - [114] [AdministratorRequest User Scenarios](./03-functional-requirements.md#administratorrequest-user-scenarios) — Define end-to-end user scenarios involving AdministratorRequest and related concepts, describing business flows from the user's perspective.
  - [115] [Category User Scenarios](./03-functional-requirements.md#category-user-scenarios) — Define end-to-end user scenarios involving Category and related concepts, describing business flows from the user's perspective.
  - [116] [Product User Scenarios](./03-functional-requirements.md#product-user-scenarios) — Define end-to-end user scenarios involving Product and related concepts, describing business flows from the user's perspective.
  - [117] [ProductImage User Scenarios](./03-functional-requirements.md#productimage-user-scenarios) — Define end-to-end user scenarios involving ProductImage and related concepts, describing business flows from the user's perspective.
  - [118] [ProductVariant User Scenarios](./03-functional-requirements.md#productvariant-user-scenarios) — Define end-to-end user scenarios involving ProductVariant and related concepts, describing business flows from the user's perspective.
  - [119] [ProductSnapshot User Scenarios](./03-functional-requirements.md#productsnapshot-user-scenarios) — Define end-to-end user scenarios involving ProductSnapshot and related concepts, describing business flows from the user's perspective.
  - [120] [InventoryRecord User Scenarios](./03-functional-requirements.md#inventoryrecord-user-scenarios) — Define end-to-end user scenarios involving InventoryRecord and related concepts, describing business flows from the user's perspective.
  - [121] [Cart User Scenarios](./03-functional-requirements.md#cart-user-scenarios) — Define end-to-end user scenarios involving Cart and related concepts, describing business flows from the user's perspective.
  - [122] [CartItem User Scenarios](./03-functional-requirements.md#cartitem-user-scenarios) — Define end-to-end user scenarios involving CartItem and related concepts, describing business flows from the user's perspective.
  - [123] [Wishlist User Scenarios](./03-functional-requirements.md#wishlist-user-scenarios) — Define end-to-end user scenarios involving Wishlist and related concepts, describing business flows from the user's perspective.
  - [124] [Order User Scenarios](./03-functional-requirements.md#order-user-scenarios) — Define end-to-end user scenarios involving Order and related concepts, describing business flows from the user's perspective.
  - [125] [OrderItem User Scenarios](./03-functional-requirements.md#orderitem-user-scenarios) — Define end-to-end user scenarios involving OrderItem and related concepts, describing business flows from the user's perspective.
  - [126] [OrderItemSnapshot User Scenarios](./03-functional-requirements.md#orderitemsnapshot-user-scenarios) — Define end-to-end user scenarios involving OrderItemSnapshot and related concepts, describing business flows from the user's perspective.
  - [127] [SellerProfileSnapshot User Scenarios](./03-functional-requirements.md#sellerprofilesnapshot-user-scenarios) — Define end-to-end user scenarios involving SellerProfileSnapshot and related concepts, describing business flows from the user's perspective.
  - [128] [Shipment User Scenarios](./03-functional-requirements.md#shipment-user-scenarios) — Define end-to-end user scenarios involving Shipment and related concepts, describing business flows from the user's perspective.
  - [129] [CancellationRequest User Scenarios](./03-functional-requirements.md#cancellationrequest-user-scenarios) — Define end-to-end user scenarios involving CancellationRequest and related concepts, describing business flows from the user's perspective.
  - [130] [CancellationRequestSnapshot User Scenarios](./03-functional-requirements.md#cancellationrequestsnapshot-user-scenarios) — Define end-to-end user scenarios involving CancellationRequestSnapshot and related concepts, describing business flows from the user's perspective.
  - [131] [RefundRequest User Scenarios](./03-functional-requirements.md#refundrequest-user-scenarios) — Define end-to-end user scenarios involving RefundRequest and related concepts, describing business flows from the user's perspective.
  - [132] [RefundRequestSnapshot User Scenarios](./03-functional-requirements.md#refundrequestsnapshot-user-scenarios) — Define end-to-end user scenarios involving RefundRequestSnapshot and related concepts, describing business flows from the user's perspective.
  - [133] [Review User Scenarios](./03-functional-requirements.md#review-user-scenarios) — Define end-to-end user scenarios involving Review and related concepts, describing business flows from the user's perspective.
  - [134] [ReviewSnapshot User Scenarios](./03-functional-requirements.md#reviewsnapshot-user-scenarios) — Define end-to-end user scenarios involving ReviewSnapshot and related concepts, describing business flows from the user's perspective.
  - [135] [Address User Scenarios](./03-functional-requirements.md#address-user-scenarios) — Define end-to-end user scenarios involving Address and related concepts, describing business flows from the user's perspective.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [136] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [137] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [138] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [139] [Customer Rules](./04-business-rules.md#customer-rules) — Define business rules, validation logic, and domain constraints for Customer.
  - [140] [Seller Rules](./04-business-rules.md#seller-rules) — Define business rules, validation logic, and domain constraints for Seller.
  - [141] [Administrator Rules](./04-business-rules.md#administrator-rules) — Define business rules, validation logic, and domain constraints for Administrator.
  - [142] [AdministratorRequest Rules](./04-business-rules.md#administratorrequest-rules) — Define business rules, validation logic, and domain constraints for AdministratorRequest.
  - [143] [Category Rules](./04-business-rules.md#category-rules) — Define business rules, validation logic, and domain constraints for Category.
  - [144] [Product Rules](./04-business-rules.md#product-rules) — Define business rules, validation logic, and domain constraints for Product.
  - [145] [ProductImage Rules](./04-business-rules.md#productimage-rules) — Define business rules, validation logic, and domain constraints for ProductImage.
  - [146] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define business rules, validation logic, and domain constraints for ProductVariant.
  - [147] [ProductSnapshot Rules](./04-business-rules.md#productsnapshot-rules) — Define business rules, validation logic, and domain constraints for ProductSnapshot.
  - [148] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define business rules, validation logic, and domain constraints for InventoryRecord.
  - [149] [Cart Rules](./04-business-rules.md#cart-rules) — Define business rules, validation logic, and domain constraints for Cart.
  - [150] [CartItem Rules](./04-business-rules.md#cartitem-rules) — Define business rules, validation logic, and domain constraints for CartItem.
  - [151] [Wishlist Rules](./04-business-rules.md#wishlist-rules) — Define business rules, validation logic, and domain constraints for Wishlist.
  - [152] [Order Rules](./04-business-rules.md#order-rules) — Define business rules, validation logic, and domain constraints for Order.
  - [153] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define business rules, validation logic, and domain constraints for OrderItem.
  - [154] [OrderItemSnapshot Rules](./04-business-rules.md#orderitemsnapshot-rules) — Define business rules, validation logic, and domain constraints for OrderItemSnapshot.
  - [155] [SellerProfileSnapshot Rules](./04-business-rules.md#sellerprofilesnapshot-rules) — Define business rules, validation logic, and domain constraints for SellerProfileSnapshot.
  - [156] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define business rules, validation logic, and domain constraints for Shipment.
  - [157] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define business rules, validation logic, and domain constraints for CancellationRequest.
  - [158] [CancellationRequestSnapshot Rules](./04-business-rules.md#cancellationrequestsnapshot-rules) — Define business rules, validation logic, and domain constraints for CancellationRequestSnapshot.
  - [159] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define business rules, validation logic, and domain constraints for RefundRequest.
  - [160] [RefundRequestSnapshot Rules](./04-business-rules.md#refundrequestsnapshot-rules) — Define business rules, validation logic, and domain constraints for RefundRequestSnapshot.
  - [161] [Review Rules](./04-business-rules.md#review-rules) — Define business rules, validation logic, and domain constraints for Review.
  - [162] [ReviewSnapshot Rules](./04-business-rules.md#reviewsnapshot-rules) — Define business rules, validation logic, and domain constraints for ReviewSnapshot.
  - [163] [Address Rules](./04-business-rules.md#address-rules) — Define business rules, validation logic, and domain constraints for Address.
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [164] [Customer Validation Rules](./04-business-rules.md#customer-validation-rules) — Define validation rules for Customer, including boundary values and format requirements.
  - [165] [Seller Validation Rules](./04-business-rules.md#seller-validation-rules) — Define validation rules for Seller, including boundary values and format requirements.
  - [166] [Administrator Validation Rules](./04-business-rules.md#administrator-validation-rules) — Define validation rules for Administrator, including boundary values and format requirements.
  - [167] [AdministratorRequest Validation Rules](./04-business-rules.md#administratorrequest-validation-rules) — Define validation rules for AdministratorRequest, including boundary values and format requirements.
  - [168] [Category Validation Rules](./04-business-rules.md#category-validation-rules) — Define validation rules for Category, including boundary values and format requirements.
  - [169] [Product Validation Rules](./04-business-rules.md#product-validation-rules) — Define validation rules for Product, including boundary values and format requirements.
  - [170] [ProductImage Validation Rules](./04-business-rules.md#productimage-validation-rules) — Define validation rules for ProductImage, including boundary values and format requirements.
  - [171] [ProductVariant Validation Rules](./04-business-rules.md#productvariant-validation-rules) — Define validation rules for ProductVariant, including boundary values and format requirements.
  - [172] [ProductSnapshot Validation Rules](./04-business-rules.md#productsnapshot-validation-rules) — Define validation rules for ProductSnapshot, including boundary values and format requirements.
  - [173] [InventoryRecord Validation Rules](./04-business-rules.md#inventoryrecord-validation-rules) — Define validation rules for InventoryRecord, including boundary values and format requirements.
  - [174] [Cart Validation Rules](./04-business-rules.md#cart-validation-rules) — Define validation rules for Cart, including boundary values and format requirements.
  - [175] [CartItem Validation Rules](./04-business-rules.md#cartitem-validation-rules) — Define validation rules for CartItem, including boundary values and format requirements.
  - [176] [Wishlist Validation Rules](./04-business-rules.md#wishlist-validation-rules) — Define validation rules for Wishlist, including boundary values and format requirements.
  - [177] [Order Validation Rules](./04-business-rules.md#order-validation-rules) — Define validation rules for Order, including boundary values and format requirements.
  - [178] [OrderItem Validation Rules](./04-business-rules.md#orderitem-validation-rules) — Define validation rules for OrderItem, including boundary values and format requirements.
  - [179] [OrderItemSnapshot Validation Rules](./04-business-rules.md#orderitemsnapshot-validation-rules) — Define validation rules for OrderItemSnapshot, including boundary values and format requirements.
  - [180] [SellerProfileSnapshot Validation Rules](./04-business-rules.md#sellerprofilesnapshot-validation-rules) — Define validation rules for SellerProfileSnapshot, including boundary values and format requirements.
  - [181] [Shipment Validation Rules](./04-business-rules.md#shipment-validation-rules) — Define validation rules for Shipment, including boundary values and format requirements.
  - [182] [CancellationRequest Validation Rules](./04-business-rules.md#cancellationrequest-validation-rules) — Define validation rules for CancellationRequest, including boundary values and format requirements.
  - [183] [CancellationRequestSnapshot Validation Rules](./04-business-rules.md#cancellationrequestsnapshot-validation-rules) — Define validation rules for CancellationRequestSnapshot, including boundary values and format requirements.
  - [184] [RefundRequest Validation Rules](./04-business-rules.md#refundrequest-validation-rules) — Define validation rules for RefundRequest, including boundary values and format requirements.
  - [185] [RefundRequestSnapshot Validation Rules](./04-business-rules.md#refundrequestsnapshot-validation-rules) — Define validation rules for RefundRequestSnapshot, including boundary values and format requirements.
  - [186] [Review Validation Rules](./04-business-rules.md#review-validation-rules) — Define validation rules for Review, including boundary values and format requirements.
  - [187] [ReviewSnapshot Validation Rules](./04-business-rules.md#reviewsnapshot-validation-rules) — Define validation rules for ReviewSnapshot, including boundary values and format requirements.
  - [188] [Address Validation Rules](./04-business-rules.md#address-validation-rules) — Define validation rules for Address, including boundary values and format requirements.
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [189] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [190] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [191] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [192] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [193] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [194] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [195] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [196] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [197] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [198] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [199] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [200] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [201] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [202] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **Customer**: email: string, required, unique, password: string, required, displayName: string, phoneNumber: string, banned: boolean, default false
- **Seller**: email: string, required, unique, password: string, required, shopName: string, required, shopDescription: text, logoImage: string (URL), approvalStatus: enum (pending/approved/rejected), rejectionReason: text, suspended: boolean, default false, banned: boolean, default false
- **Administrator**: email: string, required, unique, password: string, required, grade: enum (regular/super)
- **AdministratorRequest**: reason: text, required, status: enum (pending/approved/rejected), reviewedAt: datetime, reviewedBy: Administrator reference
- **Category**: name: string, required, description: text, parentId: Category reference (for subcategories)
- **Product**: name: string, required, description: text, required, basePrice: decimal, required, categoryId: Category reference, required
- **ProductImage**: imageUrl: string, required, displayOrder: integer, createdAt: datetime
- **ProductVariant**: skuCode: string, required, unique, optionValues: json (e.g., color, size), price: decimal (overrides base price), stockQuantity: integer, calculated from InventoryRecords
- **ProductSnapshot**: name: string, description: text, basePrice: decimal, images: json array, createdAt: datetime
- **InventoryRecord**: quantityChange: integer (positive for restock, negative for orders), reason: text, required, createdAt: datetime, required
- **Cart**: createdAt: datetime, updatedAt: datetime
- **CartItem**: quantity: integer, required, createdAt: datetime
- **Wishlist**: createdAt: datetime
- **Order**: orderNumber: string, unique, required, totalPrice: decimal, required, status: enum (paid/shipped/delivered/cancelled/refunded/partially_completed), shippingAddress: json, required, createdAt: datetime
- **OrderItem**: quantity: integer, required, price: decimal, required, status: enum (paid/shipped/delivered/cancelled/refunded)
- **OrderItemSnapshot**: productName: string, productDescription: text, variantOptions: json, price: decimal, sellerShopName: string, sellerLogoImage: string, createdAt: datetime
- **SellerProfileSnapshot**: shopName: string, shopDescription: text, logoImage: string, createdAt: datetime
- **Shipment**: carrierName: string, required, trackingNumber: string, required, shippedAt: datetime, required, deliveredAt: datetime (confirmed or auto after 14 days)
- **CancellationRequest**: reason: text, required, status: enum (pending/approved/rejected), createdAt: datetime, respondedAt: datetime
- **CancellationRequestSnapshot**: reason: text, status: enum, createdAt: datetime
- **RefundRequest**: reason: text, required, status: enum (pending/approved/rejected), createdAt: datetime, respondedAt: datetime
- **RefundRequestSnapshot**: reason: text, status: enum, createdAt: datetime
- **Review**: rating: integer (1-5), required, content: text, createdAt: datetime, deletedAt: datetime (soft delete)
- **ReviewSnapshot**: rating: integer, content: text, createdAt: datetime
- **Address**: recipientName: string, required, phoneNumber: string, required, streetAddress: string, required, city: string, required, stateProvince: string, required, postalCode: string, required, country: string, required, isDefault: boolean, default false

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

- external-integration
- file-storage