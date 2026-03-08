### Table of Contents

**ecommerceMall** is a backend service with the following actors and domain entities.

**Actors**: customer, seller, admin
**Entities**: Customer, CustomerProfile, ShippingAddress, Seller, SellerProfile, Category, Product, ProductVariant, ProductImage, Wishlist, ShoppingCart, CartItem, Order, OrderItem, Shipment, CancellationRequest, RefundRequest, Review, InventoryRecord, AdminRequest, Snapshot

---

**Scope**

- **Customer**: email: unique, passwordHash: required, createdAt: required, isBanned: required, banReason: optional | Relationships: owns CustomerProfile, owns multiple ShippingAddresses, has multiple Orders, owns multiple Wishlist entries, writes multiple Reviews
- **CustomerProfile**: displayName: text(1-100), phoneNumber: optional, customer: required, createdAt: required, updatedAt: required | Relationships: belongs to Customer, can be edited by Customer
- **ShippingAddress**: recipientName: text, phoneNumber: text, streetAddress: text, city: text, state: text, postalCode: text, country: text, isDefault: boolean | Relationships: belongs to Customer, can be selected during checkout
- **Seller**: email: unique, passwordHash: required, approvalStatus: pending|approved|rejected, rejectionReason: optional, isSuspended: boolean, isBanned: boolean, createdAt: required | Relationships: owns SellerProfile, owns multiple Products, has multiple OrderItems
- **SellerProfile**: shopName: text(1-100), shopDescription: text, logoImage: file, seller: required, createdAt: required, updatedAt: required | Relationships: belongs to Seller, can be edited by Seller (creates snapshot), viewed by Customers
- **Category**: name: text, description: text, parentCategory: optional, isLeaf: boolean | Relationships: can have parent Category, contains multiple Products
- **Product**: name: text(1-500), description: text, basePrice: required, category: required, seller: required, isActive: boolean, createdAt: required, updatedAt: required | Relationships: belongs to Seller, belongs to Category, owns multiple ProductVariants, has multiple ProductImages, witnessed by multiple OrderItems
- **ProductVariant**: skuCode: text(50), optionValues: json, priceOverride: optional, stockQuantity: required, isActive: boolean, product: required, createdAt: required, updatedAt: required | Relationships: belongs to Product, owned by OrderItems, tracked by InventoryRecords
- **ProductImage**: imageUrl: text(2000), displayOrder: integer, product: required, createdAt: required | Relationships: belongs to Product, ordered for display (first is main image)
- **Wishlist**: customer: required, product: required, createdAt: required | Relationships: belongs to Customer, references Product, removed when Product is deleted
- **ShoppingCart**: customer: required, createdAt: required, updatedAt: required | Relationships: belongs to Customer, contains multiple CartItems
- **CartItem**: cart: required, variant: required, quantity: required, addedAt: required | Relationships: belongs to ShoppingCart, references ProductVariant, must select specific variant
- **Order**: orderNumber: text, customer: required, totalPrice: required, overallStatus: paid|shipped|delivered|cancelled|refunded|partiallyCompleted, createdAt: required, updatedAt: required | Relationships: belongs to Customer, contains multiple OrderItems, has multiple Shipments
- **OrderItem**: itemStatus: paid|shipped|delivered|cancelled|refunded, quantity: required, unitPrice: required, productSnapshot: json, variantSnapshot: json, sellerProfileSnapshot: json, order: required, product: required, variant: required, createdAt: required, updatedAt: required | Relationships: belongs to Order, references Product, references ProductVariant, witnessed by CancellationRequest, witnessed by RefundRequest
- **Shipment**: carrierName: text, trackingNumber: text, orderId: required, seller: required, createdAt: required, updatedAt: required | Relationships: belongs to Order, contains multiple OrderItems, created by Seller, items share tracking info
- **CancellationRequest**: reason: text, requestStatus: pending|approved|rejected, orderItem: required, createdAt: required, updatedAt: required | Relationships: references OrderItem, response creates snapshot, can be approved/rejected by Seller
- **RefundRequest**: reason: text, requestStatus: pending|approved|rejected, orderItem: required, createdAt: required, updatedAt: required, timeLimit: 7 days after delivery | Relationships: references OrderItem, response creates snapshot, can be approved/rejected by Seller
- **Review**: rating: 1-5 stars, textContent: optional, customer: required, product: required, isActive: boolean, createdAt: required, updatedAt: required | Relationships: belongs to Customer, belongs to Product, only for delivered items, can be edited (creates snapshot)
- **InventoryRecord**: quantityChange: positive|negative, reason: text, timestamp: required, variant: required | Relationships: belongs to ProductVariant, used to calculate current stock, not a snapshot (append-only history)
- **AdminRequest**: reason: text, requestStatus: pending|approved|rejected, requester: required, createdAt: required | Relationships: belongs to User (customer or seller), approved by SuperAdmin, grants admin role when approved
- **Snapshot**: recordType: text, recordId: text, changes: json, oldValues: json, newValues: json, changedAt: required, changedBy: required | Relationships: preserves state of: Products, ProductVariants, SellerProfiles, OrderItems, Reviews, CancellationRequests, RefundRequests, immutable and cannot be deleted

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
  - [4] [customer Actor](./01-actors-and-auth.md#customer-actor-1) — Define the customer actor's role and capabilities in business terms.
  - [5] [seller Actor](./01-actors-and-auth.md#seller-actor-1) — Define the seller actor's role and capabilities in business terms.
  - [6] [admin Actor](./01-actors-and-auth.md#admin-actor-1) — Define the admin actor's role and capabilities in business terms.
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [7] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [8] [Session and Token Policy](./01-actors-and-auth.md#session-and-token-policy) — Define session duration, token refresh, and expiration policies.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [9] [Account States and Transitions](./01-actors-and-auth.md#account-states-and-transitions) — Define account states (active, suspended, deleted) and valid transitions.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [10] [Customer Concept](./02-domain-model.md#customer-concept) — Describe what Customer represents in the business domain, its purpose, and how users interact with it.
  - [11] [CustomerProfile Concept](./02-domain-model.md#customerprofile-concept) — Describe what CustomerProfile represents in the business domain, its purpose, and how users interact with it.
  - [12] [ShippingAddress Concept](./02-domain-model.md#shippingaddress-concept) — Describe what ShippingAddress represents in the business domain, its purpose, and how users interact with it.
  - [13] [Seller Concept](./02-domain-model.md#seller-concept) — Describe what Seller represents in the business domain, its purpose, and how users interact with it.
  - [14] [SellerProfile Concept](./02-domain-model.md#sellerprofile-concept) — Describe what SellerProfile represents in the business domain, its purpose, and how customers interact with it.
  - [15] [Category Concept](./02-domain-model.md#category-concept) — Describe what Category represents in the business domain, its purpose, and how users interact with it.
  - [16] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain, its purpose, and how users interact with it.
  - [17] [ProductVariant Concept](./02-domain-model.md#productvariant-concept) — Describe what ProductVariant represents in the business domain, its purpose, and how users interact with it.
  - [18] [ProductImage Concept](./02-domain-model.md#productimage-concept) — Describe what ProductImage represents in the business domain, its purpose, and how users interact with it.
  - [19] [Wishlist Concept](./02-domain-model.md#wishlist-concept) — Describe what Wishlist represents in the business domain, its purpose, and how users interact with it.
  - [20] [ShoppingCart Concept](./02-domain-model.md#shoppingcart-concept) — Describe what ShoppingCart represents in the business domain, its purpose, and how users interact with it.
  - [21] [CartItem Concept](./02-domain-model.md#cartitem-concept) — Describe what CartItem represents in the business domain, its purpose, and how users interact with it.
  - [22] [Order Concept](./02-domain-model.md#order-concept) — Describe what Order represents in the business domain, its purpose, and how users interact with it.
  - [23] [OrderItem Concept](./02-domain-model.md#orderitem-concept) — Describe what OrderItem represents in the business domain, its purpose, and how users interact with it.
  - [24] [Shipment Concept](./02-domain-model.md#shipment-concept) — Describe what Shipment represents in the business domain, its purpose, and how users interact with it.
  - [25] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain, its purpose, and how users interact with it.
  - [26] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain, its purpose, and how users interact with it.
  - [27] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain, its purpose, and how users interact with it.
  - [28] [InventoryRecord Concept](./02-domain-model.md#inventoryrecord-concept) — Describe what InventoryRecord represents in the business domain, its purpose, and how users interact with it.
  - [29] [AdminRequest Concept](./02-domain-model.md#adminrequest-concept) — Describe what AdminRequest represents in the business domain, its purpose, and how users interact with it.
  - [30] [Snapshot Concept](./02-domain-model.md#snapshot-concept) — Describe what Snapshot represents in the business domain, its purpose, and how users interact with it.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [31] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [32] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe business rules for concept lifecycle and data retention from a user perspective.
- [Enums and State Machines](./02-domain-model.md#enums-and-state-machines)
  - [33] [Enum Definitions](./02-domain-model.md#enum-definitions) — Define all enum types with their allowed values and descriptions.
  - [34] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [35] [Customer Operations](./03-functional-requirements.md#customer-operations) — Define business operations for Customer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [CustomerProfile Operations](./03-functional-requirements.md#customerprofile-operations) — Define business operations for CustomerProfile: what create, update, delete, and list operations must accomplish from a business perspective.
  - [37] [ShippingAddress Operations](./03-functional-requirements.md#shippingaddress-operations) — Define business operations for ShippingAddress: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [Seller Operations](./03-functional-requirements.md#seller-operations) — Define business operations for Seller: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [SellerProfile Operations](./03-functional-requirements.md#sellerprofile-operations) — Define business operations for SellerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [ProductImage Operations](./03-functional-requirements.md#productimage-operations) — Define business operations for ProductImage: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [Wishlist Operations](./03-functional-requirements.md#wishlist-operations) — Define business operations for Wishlist: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [ShoppingCart Operations](./03-functional-requirements.md#shoppingcart-operations) — Define business operations for ShoppingCart: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [CartItem Operations](./03-functional-requirements.md#cartitem-operations) — Define business operations for CartItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [49] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [50] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [51] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [52] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [53] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [54] [AdminRequest Operations](./03-functional-requirements.md#adminrequest-operations) — Define business operations for AdminRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [55] [Snapshot Operations](./03-functional-requirements.md#snapshot-operations) — Define business operations for Snapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Business Actions and Workflows](./03-functional-requirements.md#business-actions-and-workflows)
  - [56] [Customer Actions](./03-functional-requirements.md#customer-actions) — Define business actions and workflows for the Customer domain group from a functional requirements perspective.
  - [57] [CustomerProfile Actions](./03-functional-requirements.md#customerprofile-actions) — Define business actions and workflows for the CustomerProfile domain group from a functional requirements perspective.
  - [58] [ShippingAddress Actions](./03-functional-requirements.md#shippingaddress-actions) — Define business actions and workflows for the ShippingAddress domain group from a functional requirements perspective.
  - [59] [Seller Actions](./03-functional-requirements.md#seller-actions) — Define business actions and workflows for the Seller domain group from a functional requirements perspective.
  - [60] [SellerProfile Actions](./03-functional-requirements.md#sellerprofile-actions) — Define business actions and workflows for the SellerProfile domain group from a functional requirements perspective.
  - [61] [Category Actions](./03-functional-requirements.md#category-actions) — Define business actions and workflows for the Category Actions domain group from a functional requirements perspective.
  - [62] [Product Actions](./03-functional-requirements.md#product-actions) — Define business actions and workflows for the Product domain group from a functional requirements perspective.
  - [63] [ProductVariant Actions](./03-functional-requirements.md#productvariant-actions) — Define business actions and workflows for the ProductVariant domain group from a functional requirements perspective.
  - [64] [ProductImage Actions](./03-functional-requirements.md#productimage-actions) — Define business actions and workflows for the ProductImage domain group from a functional requirements perspective.
  - [65] [Wishlist Actions](./03-functional-requirements.md#wishlist-actions) — Define business actions and workflows for the Wishlist domain group from a functional requirements perspective.
  - [66] [ShoppingCart Actions](./03-functional-requirements.md#shoppingcart-actions) — Define business actions and workflows for the ShoppingCart domain group from a functional requirements perspective.
  - [67] [CartItem Actions](./03-functional-requirements.md#cartitem-actions) — Define business actions and workflows for the CartItem domain group from a functional requirements perspective.
  - [68] [Order Actions](./03-functional-requirements.md#order-actions) — Define business actions and workflows for the Order domain group from a functional requirements perspective.
  - [69] [OrderItem Actions](./03-functional-requirements.md#orderitem-actions) — Define business actions and workflows for the OrderItem domain group from a functional requirements perspective.
  - [70] [Shipment Actions](./03-functional-requirements.md#shipment-actions) — Define business actions and workflows for the Shipment domain group from a functional requirements perspective.
  - [71] [CancellationRequest Actions](./03-functional-requirements.md#cancellationrequest-actions) — Define business actions and workflows for the CancellationRequest domain group from a functional requirements perspective.
  - [72] [RefundRequest Actions](./03-functional-requirements.md#refundrequest-actions) — Define business actions and workflows for the RefundRequest domain group from a functional requirements perspective.
  - [73] [Review Actions](./03-functional-requirements.md#review-actions) — Define business actions and workflows for the Review domain group from a functional requirements perspective.
  - [74] [InventoryRecord Actions](./03-functional-requirements.md#inventoryrecord-actions) — Define business actions and workflows for the InventoryRecord domain group from a functional requirements perspective.
  - [75] [AdminRequest Actions](./03-functional-requirements.md#adminrequest-actions) — Define business actions and workflows for the AdminRequest domain group from a functional requirements perspective.
  - [76] [Snapshot Actions](./03-functional-requirements.md#snapshot-actions) — Define business actions and workflows for the Snapshot domain group from a functional requirements perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [77] [Customer Error Scenarios](./03-functional-requirements.md#customer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Customer operations.
  - [78] [CustomerProfile Error Scenarios](./03-functional-requirements.md#customerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CustomerProfile operations.
  - [79] [ShippingAddress Error Scenarios](./03-functional-requirements.md#shippingaddress-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ShippingAddress operations.
  - [80] [Seller Error Scenarios](./03-functional-requirements.md#seller-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Seller operations.
  - [81] [SellerProfile Error Scenarios](./03-functional-requirements.md#sellerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfile operations.
  - [82] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [83] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [84] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [85] [ProductImage Error Scenarios](./03-functional-requirements.md#productimage-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductImage operations.
  - [86] [Wishlist Error Scenarios](./03-functional-requirements.md#wishlist-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Wishlist operations.
  - [87] [ShoppingCart Error Scenarios](./03-functional-requirements.md#shoppingcart-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ShoppingCart operations.
  - [88] [CartItem Error Scenarios](./03-functional-requirements.md#cartitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CartItem operations.
  - [89] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [90] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error errors for all OrderItem operations.
  - [91] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [92] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [93] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequest operations.
  - [94] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [95] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [96] [AdminRequest Error Scenarios](./03-functional-requirements.md#adminrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdminRequest operations.
  - [97] [Snapshot Error Scenarios](./03-functional-requirements.md#snapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Snapshot operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [98] [Customer User Scenarios](./03-functional-requirements.md#customer-user-scenarios) — Define end-to-end user scenarios involving Customer and related concepts, describing business flows from the user's perspective.
  - [99] [CustomerProfile User Scenarios](./03-functional-requirements.md#customerprofile-user-scenarios) — Define end-to-end user scenarios involving CustomerProfile and related concepts, describing business flows from the user's perspective.
  - [100] [ShippingAddress User Scenarios](./03-functional-requirements.md#shippingaddress-user-scenarios) — Define end-to-end user scenarios involving ShippingAddress and related concepts, describing business flows from the user's perspective.
  - [101] [Seller User Scenarios](./03-functional-requirements.md#seller-user-scenarios) — Define end-to-end user scenarios involving Seller and related concepts, describing business flows from the user's perspective.
  - [102] [SellerProfile User Scenarios](./03-functional-requirements.md#sellerprofile-user-scenarios) — Define end-to-end user scenarios involving SellerProfile and related concepts, describing business flows from the user's perspective.
  - [103] [Category User Scenarios](./03-functional-requirements.md#category-user-scenarios) — Define end-to-end user scenarios involving Category and related concepts, describing business flows from the user's perspective.
  - [104] [Product User Scenarios](./03-functional-requirements.md#product-user-scenarios) — Define end-to-end user scenarios involving Product and related concepts, describing business flows from the user's perspective.
  - [105] [ProductVariant User Scenarios](./03-functional-requirements.md#productvariant-user-scenarios) — Define end-to-end user scenarios involving ProductVariant and related concepts, describing business flows from the user's perspective.
  - [106] [ProductImage User Scenarios](./03-functional-requirements.md#productimage-user-scenarios) — Define end-to-end user scenarios involving ProductImage and related concepts, describing business flows from the user's perspective.
  - [107] [Wishlist User Scenarios](./03-functional-requirements.md#wishlist-user-scenarios) — Define end-to-end user scenarios involving Wishlist and related concepts, describing business flows from the user's perspective.
  - [108] [ShoppingCart User Scenarios](./03-functional-requirements.md#shoppingcart-user-scenarios) — Define end-to-end user scenarios involving ShoppingCart and related concepts, describing business flows from the user's perspective.
  - [109] [CartItem User Scenarios](./03-functional-requirements.md#cartitem-user-scenarios) — Define end-to-end user scenarios involving CartItem and related concepts, describing business flows from the user's perspective.
  - [110] [Order User Scenarios](./03-functional-requirements.md#order-user-scenarios) — Define end-to-end user scenarios involving Order and related concepts, describing business flows from the user's perspective.
  - [111] [OrderItem User Scenarios](./03-functional-requirements.md#orderitem-user-scenarios) — Define end-to-end user scenarios involving OrderItem and related concepts, describing business flows from the user's perspective.
  - [112] [Shipment User Scenarios](./03-functional-requirements.md#shipment-user-scenarios) — Define end-to-end user scenarios involving Shipment and related concepts, describing business flows from the user's perspective.
  - [113] [CancellationRequest User Scenarios](./03-functional-requirements.md#cancellationrequest-user-scenarios) — Define end-to-end user scenarios involving CancellationRequest and related concepts, describing business flows from the perspective.
  - [114] [RefundRequest User Scenarios](./03-functional-requirements.md#refundrequest-user-scenarios) — Define end-to-end user scenarios involving RefundRequest and related concepts, describing business flows from the user's perspective.
  - [115] [Review User Scenarios](./03-functional-requirements.md#review-user-scenarios) — Define end-to-end user scenarios involving Review and related concepts, describing business flows from the user's perspective.
  - [116] [InventoryRecord User Scenarios](./03-functional-requirements.md#inventoryrecord-user-scenarios) — Define end-to-end user scenarios involving InventoryRecord and related concepts, describing business flows from the user's perspective.
  - [117] [AdminRequest User Scenarios](./03-functional-requirements.md#adminrequest-user-scenarios) — Define end-to-end user scenarios involving AdminRequest and related concepts, describing business flows from the user's perspective.
  - [118] [Snapshot User Scenarios](./03-functional-requirements.md#snapshot-user-scenarios) — Define end-to-end user scenarios involving Snapshot and related concepts, describing business flows from the user's perspective.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [119] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [120] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.
- [Background Processing](./03-functional-requirements.md#background-processing)
  - [121] [Job Specifications](./03-functional-requirements.md#job-specifications) — Define background jobs, queue configurations, retry policies, and scheduling rules for asynchronous processing.

**[04-business-rules.md](./04-business-rules.md)**
- [Data Isolation and Ownership](./04-business-rules.md#data-isolation-and-ownership)
  - [122] [Ownership and Isolation Rules](./04-business-rules.md#ownership-and-isolation-rules) — Define data ownership semantics and isolation boundaries for multi-user access.
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [123] [Customer Rules](./04-business-rules.md#customer-rules) — Define business rules, validation logic, and domain constraints for Customer.
  - [124] [CustomerProfile Rules](./04-business-rules.md#customerprofile-rules) — Define business rules, validation logic, and domain constraints for CustomerProfile.
  - [125] [ShippingAddress Rules](./04-business-rules.md#shippingaddress-rules) — Define business rules, validation logic, and domain constraints for ShippingAddress.
  - [126] [Seller Rules](./04-business-rules.md#seller-rules) — Define business rules, validation logic, and domain constraints for Seller.
  - [127] [SellerProfile Rules](./04-business-rules.md#sellerprofile-rules) — Define business rules, validation logic, and domain constraints for SellerProfile.
  - [128] [Category Rules](./04-business-rules.md#category-rules) — Define business rules, validation logic, and domain constraints for Category.
  - [129] [Product Rules](./04-business-rules.md#product-rules) — Define business rules, validation logic, and domain constraints for Product.
  - [130] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define business rules, validation logic, and domain constraints for ProductVariant.
  - [131] [ProductImage Rules](./04-business-rules.md#productimage-rules) — Define business rules, validation logic, and domain constraints for ProductImage.
  - [132] [Wishlist Rules](./04-business-rules.md#wishlist-rules) — Define business rules, validation logic, and domain constraints for Wishlist.
  - [133] [ShoppingCart Rules](./04-business-rules.md#shoppingcart-rules) — Define business rules, validation logic, and domain constraints for ShoppingCart.
  - [134] [CartItem Rules](./04-business-rules.md#cartitem-rules) — Define business rules, validation logic, and domain constraints for CartItem.
  - [135] [Order Rules](./04-business-rules.md#order-rules) — Define business rules, validation logic, and domain constraints for Order.
  - [136] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define business rules, validation logic, and domain constraints for OrderItem.
  - [137] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define business rules, validation logic, and domain constraints for Shipment.
  - [138] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define business rules, validation logic, and domain constraints for CancellationRequest.
  - [139] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define business rules, validation logic, and domain constraints for RefundRequest.
  - [140] [Review Rules](./04-business-rules.md#review-rules) — Define business rules, validation logic, and domain constraints for Review.
  - [141] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define business rules, validation logic, and domain constraints for InventoryRecord.
  - [142] [AdminRequest Rules](./04-business-rules.md#adminrequest-rules) — Define business rules, validation logic, and domain constraints for AdminRequest.
  - [143] [Snapshot Rules](./04-business-rules.md#snapshot-rules) — Define business rules, validation logic, and domain constraints for Snapshot.
- [Detailed Validation Rules](./04-business-rules.md#detailed-validation-rules)
  - [144] [Customer Validation Rules](./04-business-rules.md#customer-validation-rules) — Define validation rules for Customer, including boundary values and format requirements.
  - [145] [CustomerProfile Validation Rules](./04-business-rules.md#customerprofile-validation-rules) — Define validation rules for CustomerProfile, including boundary values and format requirements.
  - [146] [ShippingAddress Validation Rules](./04-business-rules.md#shippingaddress-validation-rules) — Define validation rules for ShippingAddress, including boundary values and format requirements.
  - [147] [Seller Validation Rules](./04-business-rules.md#seller-validation-rules) — Define validation rules for Seller, including boundary values and format requirements.
  - [148] [SellerProfile Validation Rules](./04-business-rules.md#sellerprofile-validation-rules) — Define validation rules for SellerProfile, including boundary values and format requirements.
  - [149] [Category Validation Rules](./04-business-rules.md#category-validation-rules) — Define validation rules for Category, including boundary values and format requirements.
  - [150] [Product Validation Rules](./04-business-rules.md#product-validation-rules) — Define validation rules for Product, including boundary values and format requirements.
  - [151] [ProductVariant Validation Rules](./04-business-rules.md#productvariant-validation-rules) — Define validation rules for ProductVariant, including boundary values and format requirements.
  - [152] [ProductImage Validation Rules](./04-business-rules.md#productimage-validation-rules) — Define validation rules for ProductImage, including boundary values and format requirements.
  - [153] [Wishlist Validation Rules](./04-business-rules.md#wishlist-validation-rules) — Define validation rules for Wishlist, including boundary values and format requirements.
  - [154] [ShoppingCart Validation Rules](./04-business-rules.md#shoppingcart-validation-rules) — Define validation rules for ShoppingCart, including boundary values and format requirements.
  - [155] [CartItem Validation Rules](./04-business-rules.md#cartitem-validation-rules) — Define validation rules for CartItem, including boundary values and format requirements.
  - [156] [Order Validation Rules](./04-business-rules.md#order-validation-rules) — Define validation rules for Order, including boundary values and format requirements.
  - [157] [OrderItem Validation Rules](./04-business-rules.md#orderitem-validation-rules) — Define validation rules for OrderItem, including boundary values and format requirements.
  - [158] [Shipment Validation Rules](./04-business-rules.md#shipment-validation-rules) — Define validation rules for Shipment, including boundary values and format requirements.
  - [159] [CancellationRequest Validation Rules](./04-business-rules.md#cancellationrequest-validation-rules) — Define validation rules for CancellationRequest, including boundary values and format requirements.
  - [160] [RefundRequest Validation Rules](./04-business-rules.md#refundrequest-validation-rules) — Define validation rules for RefundRequest, including boundary values and format requirements.
  - [161] [Review Validation Rules](./04-business-rules.md#review-validation-rules) — Define validation rules for Review, including boundary values and format requirements.
  - [162] [InventoryRecord Validation Rules](./04-business-rules.md#inventoryrecord-validation-rules) — Define validation rules for InventoryRecord, including boundary values and format requirements.
  - [163] [AdminRequest Validation Rules](./04-business-rules.md#adminrequest-validation-rules) — Define validation rules for AdminRequest, including boundary values and format requirements.
  - [164] [Snapshot Validation Rules](./04-business-rules.md#snapshot-validation-rules) — Define validation rules for Snapshot, including boundary values and format requirements.
- [Filtering, Sorting, and Pagination](./04-business-rules.md#filtering-sorting-and-pagination)
  - [165] [List Query Specifications](./04-business-rules.md#list-query-specifications) — Define filtering, sorting, and pagination rules for list operations.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [166] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [167] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [168] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.
- [Job Failure Policies](./04-business-rules.md#job-failure-policies)
  - [169] [Job Failure and Recovery](./04-business-rules.md#job-failure-and-recovery) — Define failure handling, recovery procedures, and notification requirements for background jobs.

**[05-non-functional.md](./05-non-functional.md)**
- [Performance Requirements](./05-non-functional.md#performance-requirements)
  - [170] [Performance SLOs](./05-non-functional.md#performance-slos) — Define response time targets, throughput limits, and scalability requirements.
  - [171] [Rate Limiting and Throttling](./05-non-functional.md#rate-limiting-and-throttling) — Define rate limiting policies and abuse prevention requirements.
- [Security Requirements](./05-non-functional.md#security-requirements)
  - [172] [Security Policies](./05-non-functional.md#security-policies) — Define security policies including encryption, input validation, and compliance.
  - [173] [Availability and Reliability](./05-non-functional.md#availability-and-reliability) — Define availability targets, reliability expectations, and failover policies.
- [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage)
  - [174] [Data Integrity and Storage](./05-non-functional.md#data-integrity-and-storage-1) — Define backup policies, data retention, and storage tier requirements.
  - [175] [Audit and Observability](./05-non-functional.md#audit-and-observability) — Define audit logging, monitoring, alerting, and observability requirements.
- [Concurrency and Data Consistency](./05-non-functional.md#concurrency-and-data-consistency)
  - [176] [Concurrency Control Policies](./05-non-functional.md#concurrency-control-policies) — Define optimistic/pessimistic locking strategies, conflict resolution, and retry semantics for concurrent operations.
  - [177] [Data Consistency Guarantees](./05-non-functional.md#data-consistency-guarantees) — Define consistency models, transactional boundary requirements, and idempotency guarantees.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [178] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [179] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.
- [Queue Performance](./05-non-functional.md#queue-performance)
  - [180] [Queue Performance SLOs](./05-non-functional.md#queue-performance-slos) — Define performance requirements for background job processing.

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

- **Customer**: email: unique, passwordHash: required, createdAt: required, isBanned: required, banReason: optional
- **CustomerProfile**: displayName: text(1-100), phoneNumber: optional, customer: required, createdAt: required, updatedAt: required
- **ShippingAddress**: recipientName: text, phoneNumber: text, streetAddress: text, city: text, state: text, postalCode: text, country: text, isDefault: boolean
- **Seller**: email: unique, passwordHash: required, approvalStatus: pending|approved|rejected, rejectionReason: optional, isSuspended: boolean, isBanned: boolean, createdAt: required
- **SellerProfile**: shopName: text(1-100), shopDescription: text, logoImage: file, seller: required, createdAt: required, updatedAt: required
- **Category**: name: text, description: text, parentCategory: optional, isLeaf: boolean
- **Product**: name: text(1-500), description: text, basePrice: required, category: required, seller: required, isActive: boolean, createdAt: required, updatedAt: required
- **ProductVariant**: skuCode: text(50), optionValues: json, priceOverride: optional, stockQuantity: required, isActive: boolean, product: required, createdAt: required, updatedAt: required
- **ProductImage**: imageUrl: text(2000), displayOrder: integer, product: required, createdAt: required
- **Wishlist**: customer: required, product: required, createdAt: required
- **ShoppingCart**: customer: required, createdAt: required, updatedAt: required
- **CartItem**: cart: required, variant: required, quantity: required, addedAt: required
- **Order**: orderNumber: text, customer: required, totalPrice: required, overallStatus: paid|shipped|delivered|cancelled|refunded|partiallyCompleted, createdAt: required, updatedAt: required
- **OrderItem**: itemStatus: paid|shipped|delivered|cancelled|refunded, quantity: required, unitPrice: required, productSnapshot: json, variantSnapshot: json, sellerProfileSnapshot: json, order: required, product: required, variant: required, createdAt: required, updatedAt: required
- **Shipment**: carrierName: text, trackingNumber: text, orderId: required, seller: required, createdAt: required, updatedAt: required
- **CancellationRequest**: reason: text, requestStatus: pending|approved|rejected, orderItem: required, createdAt: required, updatedAt: required
- **RefundRequest**: reason: text, requestStatus: pending|approved|rejected, orderItem: required, createdAt: required, updatedAt: required, timeLimit: 7 days after delivery
- **Review**: rating: 1-5 stars, textContent: optional, customer: required, product: required, isActive: boolean, createdAt: required, updatedAt: required
- **InventoryRecord**: quantityChange: positive|negative, reason: text, timestamp: required, variant: required
- **AdminRequest**: reason: text, requestStatus: pending|approved|rejected, requester: required, createdAt: required
- **Snapshot**: recordType: text, recordId: text, changes: json, oldValues: json, newValues: json, changedAt: required, changedBy: required

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
- background-processing