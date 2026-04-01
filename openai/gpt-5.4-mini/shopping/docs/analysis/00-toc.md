### Table of Contents

**mallPlatform** is a backend service with the following actors and domain entities.

**Actors**: customer, seller, administrator
**Entities**: CustomerAccount, CustomerProfile, ShippingAddress, SellerAccount, SellerProfile, Category, Product, ProductImage, ProductVariant, InventoryRecord, ShoppingCart, CartItem, Wishlist, Order, OrderItem, Shipment, CancellationRequest, RefundRequest, Review, Snapshot, AdministratorApprovalRequest, SellerApprovalRequest

---

**Scope**

- **CustomerAccount** — owns one customer profile, uses one or more shipping addresses, places orders, writes reviews, has wishlist items, has cart items
- **CustomerProfile** — belongs to one customer account
- **ShippingAddress** — belongs to one customer account
- **SellerAccount** — owns one seller profile, creates products, fulfills order items, submits products for sale
- **SellerProfile** — belongs to one seller account, is shown to customers, is preserved in purchase history snapshots
- **Category** — organizes products, may contain subcategories, is managed by administrators
- **Product** — belongs to one seller, belongs to one category, contains variants, contains images, appears in search and category listings, can be wishlisted by customers
- **ProductImage** — belongs to one product, is included in product snapshots
- **ProductVariant** — belongs to one product, has inventory history, appears in cart and order items
- **InventoryRecord** — belongs to one product variant, updates current stock through history
- **ShoppingCart** — belongs to one customer account, contains cart items
- **CartItem** — belongs to one shopping cart, references one product variant
- **Wishlist** — belongs to one customer account, contains products only
- **Order** — belongs to one customer account, contains one or more order items, may include shipments
- **OrderItem** — belongs to one order, references one product variant, belongs to one seller, can be cancelled or refunded individually, may belong to one shipment
- **Shipment** — contains order items from one seller, shares tracking information across its items
- **CancellationRequest** — belongs to one order item, is reviewed by the item’s seller or an administrator
- **RefundRequest** — belongs to one order item, is reviewed by the item’s seller or an administrator
- **Review** — belongs to one order item or purchased product context, belongs to one customer account, is shown on product detail pages
- **Snapshot** — records edits to products, product variants, seller profiles, reviews, cancellation requests, refund requests, and order-related preserved data
- **AdministratorApprovalRequest** — belongs to one customer or seller account, is reviewed by super administrators
- **SellerApprovalRequest** — belongs to one seller account, is reviewed by administrators

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
| [04-business-rules.md](./04-business-rules.md) | Business rules, validation constraints, data browsing expectations, error scenarios | service-layer |
| [05-non-functional.md](./05-non-functional.md) | Data ownership, privacy, retention, and recovery policies | test-infra |

**Section Navigation**

<!-- Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })` -->

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [customer Actor](./01-actors-and-auth.md#customer-actor) — Define the customer actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [2] [seller Actor](./01-actors-and-auth.md#seller-actor) — Define the seller actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [3] [administrator Actor](./01-actors-and-auth.md#administrator-actor) — Define the administrator actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [4] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [5] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [6] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [7] [CustomerAccount Concept](./02-domain-model.md#customeraccount-concept) — Describe what CustomerAccount represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [8] [CustomerProfile Concept](./02-domain-model.md#customerprofile-concept) — Describe what CustomerProfile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [ShippingAddress Concept](./02-domain-model.md#shippingaddress-concept) — Describe what ShippingAddress represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [SellerAccount Concept](./02-domain-model.md#selleraccount-concept) — Describe what SellerAccount represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [SellerProfile Concept](./02-domain-model.md#sellerprofile-concept) — Describe what SellerProfile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Category Concept](./02-domain-model.md#category-concept) — Describe what Category represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [Product Concept](./02-domain-model.md#product-concept) — Describe what Product represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [ProductImage Concept](./02-domain-model.md#productimage-concept) — Describe what ProductImage represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [ProductVariant Concept](./02-domain-model.md#productvariant-concept) — Describe what ProductVariant represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [InventoryRecord Concept](./02-domain-model.md#inventoryrecord-concept) — Describe what InventoryRecord represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [ShoppingCart Concept](./02-domain-model.md#shoppingcart-concept) — Describe what ShoppingCart represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [CartItem Concept](./02-domain-model.md#cartitem-concept) — Describe what CartItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [Wishlist Concept](./02-domain-model.md#wishlist-concept) — Describe what Wishlist represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [Order Concept](./02-domain-model.md#order-concept) — Describe what Order represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [21] [OrderItem Concept](./02-domain-model.md#orderitem-concept) — Describe what OrderItem represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [22] [Shipment Concept](./02-domain-model.md#shipment-concept) — Describe what Shipment represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [23] [CancellationRequest Concept](./02-domain-model.md#cancellationrequest-concept) — Describe what CancellationRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [24] [RefundRequest Concept](./02-domain-model.md#refundrequest-concept) — Describe what RefundRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [25] [Review Concept](./02-domain-model.md#review-concept) — Describe what Review represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [26] [Snapshot Concept](./02-domain-model.md#snapshot-concept) — Describe what Snapshot represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [27] [AdministratorApprovalRequest Concept](./02-domain-model.md#administratorapprovalrequest-concept) — Describe what AdministratorApprovalRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [28] [SellerApprovalRequest Concept](./02-domain-model.md#sellerapprovalrequest-concept) — Describe what SellerApprovalRequest represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [29] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [30] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [31] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [32] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [33] [CustomerAccount Operations](./03-functional-requirements.md#customeraccount-operations) — Define business operations for CustomerAccount: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [34] [CustomerProfile Operations](./03-functional-requirements.md#customerprofile-operations) — Define business operations for CustomerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [35] [ShippingAddress Operations](./03-functional-requirements.md#shippingaddress-operations) — Define business operations for ShippingAddress: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [SellerAccount Operations](./03-functional-requirements.md#selleraccount-operations) — Define business operations for SellerAccount: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [SellerProfile Operations](./03-functional-requirements.md#sellerprofile-operations) — Define business operations for SellerProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [Category Operations](./03-functional-requirements.md#category-operations) — Define business operations for Category: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [Product Operations](./03-functional-requirements.md#product-operations) — Define business operations for Product: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [ProductImage Operations](./03-functional-requirements.md#productimage-operations) — Define business operations for ProductImage: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [ProductVariant Operations](./03-functional-requirements.md#productvariant-operations) — Define business operations for ProductVariant: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [InventoryRecord Operations](./03-functional-requirements.md#inventoryrecord-operations) — Define business operations for InventoryRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [ShoppingCart Operations](./03-functional-requirements.md#shoppingcart-operations) — Define business operations for ShoppingCart: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [CartItem Operations](./03-functional-requirements.md#cartitem-operations) — Define business operations for CartItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [Wishlist Operations](./03-functional-requirements.md#wishlist-operations) — Define business operations for Wishlist: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [Order Operations](./03-functional-requirements.md#order-operations) — Define business operations for Order: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [47] [OrderItem Operations](./03-functional-requirements.md#orderitem-operations) — Define business operations for OrderItem: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [48] [Shipment Operations](./03-functional-requirements.md#shipment-operations) — Define business operations for Shipment: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [49] [CancellationRequest Operations](./03-functional-requirements.md#cancellationrequest-operations) — Define business operations for CancellationRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [50] [RefundRequest Operations](./03-functional-requirements.md#refundrequest-operations) — Define business operations for RefundRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [51] [Review Operations](./03-functional-requirements.md#review-operations) — Define business operations for Review: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [52] [Snapshot Operations](./03-functional-requirements.md#snapshot-operations) — Define business operations for Snapshot: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [53] [AdministratorApprovalRequest Operations](./03-functional-requirements.md#administratorapprovalrequest-operations) — Define business operations for AdministratorApprovalRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [54] [SellerApprovalRequest Operations](./03-functional-requirements.md#sellerapprovalrequest-operations) — Define business operations for SellerApprovalRequest: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [55] [CustomerAccount Error Scenarios](./03-functional-requirements.md#customeraccount-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CustomerAccount operations.
  - [56] [CustomerProfile Error Scenarios](./03-functional-requirements.md#customerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CustomerProfile operations.
  - [57] [ShippingAddress Error Scenarios](./03-functional-requirements.md#shippingaddress-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ShippingAddress operations.
  - [58] [SellerAccount Error Scenarios](./03-functional-requirements.md#selleraccount-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerAccount operations.
  - [59] [SellerProfile Error Scenarios](./03-functional-requirements.md#sellerprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerProfile operations.
  - [60] [Category Error Scenarios](./03-functional-requirements.md#category-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Category operations.
  - [61] [Product Error Scenarios](./03-functional-requirements.md#product-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Product operations.
  - [62] [ProductImage Error Scenarios](./03-functional-requirements.md#productimage-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductImage operations.
  - [63] [ProductVariant Error Scenarios](./03-functional-requirements.md#productvariant-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProductVariant operations.
  - [64] [InventoryRecord Error Scenarios](./03-functional-requirements.md#inventoryrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all InventoryRecord operations.
  - [65] [ShoppingCart Error Scenarios](./03-functional-requirements.md#shoppingcart-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ShoppingCart operations.
  - [66] [CartItem Error Scenarios](./03-functional-requirements.md#cartitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CartItem operations.
  - [67] [Wishlist Error Scenarios](./03-functional-requirements.md#wishlist-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Wishlist operations.
  - [68] [Order Error Scenarios](./03-functional-requirements.md#order-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Order operations.
  - [69] [OrderItem Error Scenarios](./03-functional-requirements.md#orderitem-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrderItem operations.
  - [70] [Shipment Error Scenarios](./03-functional-requirements.md#shipment-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Shipment operations.
  - [71] [CancellationRequest Error Scenarios](./03-functional-requirements.md#cancellationrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all CancellationRequest operations.
  - [72] [RefundRequest Error Scenarios](./03-functional-requirements.md#refundrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all RefundRequest operations.
  - [73] [Review Error Scenarios](./03-functional-requirements.md#review-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Review operations.
  - [74] [Snapshot Error Scenarios](./03-functional-requirements.md#snapshot-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Snapshot operations.
  - [75] [AdministratorApprovalRequest Error Scenarios](./03-functional-requirements.md#administratorapprovalrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all AdministratorApprovalRequest operations.
  - [76] [SellerApprovalRequest Error Scenarios](./03-functional-requirements.md#sellerapprovalrequest-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all SellerApprovalRequest operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [77] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [78] [CustomerAccount Rules](./04-business-rules.md#customeraccount-rules) — Define validation rules and domain constraints for CustomerAccount. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [79] [CustomerProfile Rules](./04-business-rules.md#customerprofile-rules) — Define validation rules and domain constraints for CustomerProfile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [80] [ShippingAddress Rules](./04-business-rules.md#shippingaddress-rules) — Define validation rules and domain constraints for ShippingAddress. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [81] [SellerAccount Rules](./04-business-rules.md#selleraccount-rules) — Define validation rules and domain constraints for SellerAccount. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [82] [SellerProfile Rules](./04-business-rules.md#sellerprofile-rules) — Define validation rules and domain constraints for SellerProfile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [83] [Category Rules](./04-business-rules.md#category-rules) — Define validation rules and domain constraints for Category. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [84] [Product Rules](./04-business-rules.md#product-rules) — Define validation rules and domain constraints for Product. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [85] [ProductImage Rules](./04-business-rules.md#productimage-rules) — Define validation rules and domain constraints for ProductImage. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [86] [ProductVariant Rules](./04-business-rules.md#productvariant-rules) — Define validation rules and domain constraints for ProductVariant. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [87] [InventoryRecord Rules](./04-business-rules.md#inventoryrecord-rules) — Define validation rules and domain constraints for InventoryRecord. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [88] [ShoppingCart Rules](./04-business-rules.md#shoppingcart-rules) — Define validation rules and domain constraints for ShoppingCart. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [89] [CartItem Rules](./04-business-rules.md#cartitem-rules) — Define validation rules and domain constraints for CartItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [90] [Wishlist Rules](./04-business-rules.md#wishlist-rules) — Define validation rules and domain constraints for Wishlist. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [91] [Order Rules](./04-business-rules.md#order-rules) — Define validation rules and domain constraints for Order. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [92] [OrderItem Rules](./04-business-rules.md#orderitem-rules) — Define validation rules and domain constraints for OrderItem. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [93] [Shipment Rules](./04-business-rules.md#shipment-rules) — Define validation rules and domain constraints for Shipment. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [94] [CancellationRequest Rules](./04-business-rules.md#cancellationrequest-rules) — Define validation rules and domain constraints for CancellationRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [95] [RefundRequest Rules](./04-business-rules.md#refundrequest-rules) — Define validation rules and domain constraints for RefundRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [96] [Review Rules](./04-business-rules.md#review-rules) — Define validation rules and domain constraints for Review. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [97] [Snapshot Rules](./04-business-rules.md#snapshot-rules) — Define validation rules and domain constraints for Snapshot. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [98] [AdministratorApprovalRequest Rules](./04-business-rules.md#administratorapprovalrequest-rules) — Define validation rules and domain constraints for AdministratorApprovalRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [99] [SellerApprovalRequest Rules](./04-business-rules.md#sellerapprovalrequest-rules) — Define validation rules and domain constraints for SellerApprovalRequest. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [100] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [101] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [102] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [103] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.

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

- **CustomerAccount** — owns one customer profile, uses one or more shipping addresses, places orders, writes reviews, has wishlist items, has cart items
- **CustomerProfile** — belongs to one customer account
- **ShippingAddress** — belongs to one customer account
- **SellerAccount** — owns one seller profile, creates products, fulfills order items, submits products for sale
- **SellerProfile** — belongs to one seller account, is shown to customers, is preserved in purchase history snapshots
- **Category** — organizes products, may contain subcategories, is managed by administrators
- **Product** — belongs to one seller, belongs to one category, contains variants, contains images, appears in search and category listings, can be wishlisted by customers
- **ProductImage** — belongs to one product, is included in product snapshots
- **ProductVariant** — belongs to one product, has inventory history, appears in cart and order items
- **InventoryRecord** — belongs to one product variant, updates current stock through history
- **ShoppingCart** — belongs to one customer account, contains cart items
- **CartItem** — belongs to one shopping cart, references one product variant
- **Wishlist** — belongs to one customer account, contains products only
- **Order** — belongs to one customer account, contains one or more order items, may include shipments
- **OrderItem** — belongs to one order, references one product variant, belongs to one seller, can be cancelled or refunded individually, may belong to one shipment
- **Shipment** — contains order items from one seller, shares tracking information across its items
- **CancellationRequest** — belongs to one order item, is reviewed by the item’s seller or an administrator
- **RefundRequest** — belongs to one order item, is reviewed by the item’s seller or an administrator
- **Review** — belongs to one order item or purchased product context, belongs to one customer account, is shown on product detail pages
- **Snapshot** — records edits to products, product variants, seller profiles, reviews, cancellation requests, refund requests, and order-related preserved data
- **AdministratorApprovalRequest** — belongs to one customer or seller account, is reviewed by super administrators
- **SellerApprovalRequest** — belongs to one seller account, is reviewed by administrators

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