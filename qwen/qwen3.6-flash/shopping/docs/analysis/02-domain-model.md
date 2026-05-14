**ecommerceMall — Business concepts, relationships, and states from user perspective**

Business concepts, relationships, and states from user perspective

# Domain Concepts

Describe what each concept means in the business domain and its key attributes.

## Customer Concept

The Customer concept represents the foundational identity of a shopper on the e-commerce platform. It serves as the primary account entity for anyone purchasing goods or managing a personal profile. The core business attributes include the email address, which acts as the unique system identifier, and the display name, representing the shopper's preferred public persona. This concept anchors all shopping behaviors, saved addresses, and purchase histories. Business rules dictate that a Customer record must exist to perform any action on the platform, and the account defines the user's boundaries for profile and order management. Without a valid Customer record, no commercial activities are permitted.

### Customer Concept Overview

The Customer concept defines the foundational entity representing a registered individual on the ecommerceMall platform. Operating within the business domain of digital commerce, this concept serves as the mandatory gateway to all commercial transactions. Its core business-meaning revolves around establishing a trusted participant who is fully committed to the ecosystem. Unlike unregistered guests, the business model requires a valid Customer record to initiate any shopping activity, forming the backbone of the platform's user engagement strategy.

### Shopper Identity Definition [NEEDS FIX]

The customer is primarily identified through specific business attributes that form their shopper identity. To participate in the platform, an individual must provide a Customer.email address and a password to establish this identity. The customer's profile includes a Customer.display name, which serves as the public-facing identifier for interactions like reviews and order summaries. These attributes collectively define who the shopper is and provide a recognizable persona within the marketplace.

### Purchaser Role and Account Anchor

In terms of the purchaser role, the Customer serves as the primary economic driver of the platform, executing all actions related to browsing, selecting products, and completing financial exchanges. The digital shop account represents the comprehensive container for this identity, aggregating the user's personal data, saved addresses, and purchase history. A crucial component of this account is the unique email identifier, which acts as the permanent and unchangeable system reference that anchors the customer record across all platform activities.

### Retail Consumer Profile Context [NEEDS FIX]

As an online shopping user, the Customer maintains a broader set of customer attributes to facilitate a personalized retail consumer experience. Beyond the core identifier, the retail consumer profile includes a contact phone number and configurable Customer.display name to support communication and personalization. This profile context ensures that the customer's personal preferences and communication details are consistently available throughout the checkout and support processes.

## Seller Concept

The Seller concept defines the commercial identity of a shop operator or individual vendor on the platform. It represents the responsible party behind product listings, inventory management, and order fulfillment. Key business attributes include the email address, used for secure account access and official correspondence, and the shop handle, which serves as the unique identifier for the seller's business across the marketplace. This concept groups all the products, shop profiles, and financial records belonging to a specific merchant. The business model requires a Seller to submit an application and obtain administrative approval before they can actively list items and engage in commerce.

### Core Concept Definition

Within the overarching domain, this fundamental concept establishes the business-meaning and structural purpose of the platform's retail operations, defining the supply-side foundation of the market. The core attributes that serve as the primary anchors for this entity include the user's email address, which facilitates secure communication and official correspondence, and the shop handle, which functions as the unique public alias for the account. These attributes work together to ensure clear identification and reliable contact channels between the platform administration and the registered retail account.

### Seller Identity and Merchant Role

The seller functions as the central vendor role within the platform's commercial ecosystem, operating fundamentally as a consolidated shop operator account managed by a single registered user. This record serves as the definitive merchant identity behind every listed product, ensuring that all items available for purchase are directly traceable to a verified operator. The merchant identity acts as the operational boundary, strictly separating internal system credentials from the public-facing storefront visibility required by customers.

### Coverage: Commercial Account Holder

Defined as a commercial account holder, this classification represents a formalized platform vendor type that is fully authorized to introduce merchandise into the marketplace and initiate financial transactions. The system relies heavily on the unique business identifier to maintain strict structural separation of commercial liabilities and catalog management across independent vendor footprints. Furthermore, this entity acts unequivocally as the product owner, establishing absolute and exclusive ownership rights over all merchandise listings, variant configurations, and inventory allocation records generated under their account.

### Coverage: Digital Entrepreneur

Operating actively as a digital entrepreneur, the marketplace seller leverages the platform's digital infrastructure to curate an independent business environment, overseeing catalog presentation and customer engagement. This broader designation encompasses the active commercial counterpart that interacts directly with the purchasing public, responsible for maintaining product quality and executing day-to-day retail activities. The marketplace seller concept ensures robust economic participation by providing a structured space for independent businesses to scale their operations.

## Admin Concept

The Admin concept represents an individual granted elevated privileges to oversee, regulate, and maintain the health of the e-commerce platform. It serves as the governance entity responsible for enforcing marketplace rules, resolving disputes, and managing vendor access. The core attributes are the email address, identifying the administrator within the system, and the admin grade, which categorizes their level of authority, ranging from regular administrator to super administrator. This concept establishes the hierarchical structure of platform management. Business rules strictly segregate administrative powers based on the admin grade, ensuring that sensitive actions like account bans and grade promotions are handled securely.

### Concept

In the ecommerceMall domain, the Admin concept establishes a specialized, privileged record representing the regulatory authority within the platform. Its primary business meaning is to serve as the central oversight entity ensuring marketplace integrity, fairness, and compliance for all commercial activities.

The Admin concept is anchored by two foundational attributes:
- Admin.email address: The unique identifier and primary access point for the individual holding the privilege.
- Admin.admin grade: The specific classification attribute that dictates the operational scope and baseline level of authority granted to that individual.

### Admin

The Admin represents a distinct governance user type that operates exclusively as a neutral platform overseer. Unlike standard shoppers or vendor accounts, this user type is tasked with monitoring and regulating the ecosystem to maintain trust.

Because the Admin acts as a high-level enforcer, it is endowed with extensive oversight privileges that extend beyond normal commercial boundaries. These privileges grant the entity independent intervention capabilities, allowing them to inspect sensitive data, mediate complex disputes, and manage the operational parameters of the entire digital mall without engaging in direct transactions.

### Management Role

The organization employs a structured management role framework to distribute regulatory responsibilities securely across the platform. This framework distinguishes between two primary classifications: the regular administrator and the super administrator.

Regular administrators focus on day-to-day marketplace stability, such as vendor vetting and product moderation. However, a strict differentiation exists between these tiers based on specific admin attributes. The super administrator classification is defined by elevated attributes that grant exclusive authority for high-level personnel management, including the ability to change the role classifications of other management personnel on the platform.

### Role Hierarchy

The role hierarchy establishes a strict chain of command and privilege segregation to prevent unauthorized power concentration within the platform's governance framework. Operating as a digital manager framework, authority flows downward, allowing senior personnel to govern regular administrators while protecting themselves from malicious revocation.

To guarantee platform governance stability, the hierarchy enforces protective boundaries. For example, a super administrator retains the authority to promote a regular administrator to the highest privilege level. Conversely, to prevent self-termination or unauthorized demotion, the framework strictly blocks senior digital managers from revoking their own elevated status or lowering their own clearance.

## Product Concept

The Product concept represents the primary item available for sale by a Seller within the platform's digital catalog. It serves as the foundational listing that customers browse, search, and examine before making a purchase. Its essential business attributes are the product name, providing a clear identification for shoppers, and the base price, establishing the standard cost reference for the merchandise. This concept acts as the parent entity that organizes specific variations, images, and customer feedback. Business rules dictate that a Product must maintain valid and active attributes to remain visible in search results and category pages, forming the backbone of the platform's inventory.

### Concept

The Product concept exists within the ecommerceMall domain as the central architectural idea for merchandise representation. Its business-meaning is to serve as the foundational container for all purchasable goods, ensuring consistency across the entire platform. The key attributes include the Product.product name, which provides a human-readable identifier, and the Product.base price, which establishes the standard financial reference point for the item. These attributes collectively enable the system to organize diverse goods under a unified commercial framework.

### Product

A product acts as the definitive merchandise item and catalog entry for the platform ecosystem. It functions as the primary identifier for any item a seller intends to vend, bridging the specific good with the digital marketplace. Within the product listing framework, this entity encapsulates the essential information visible to browsers, such as the associated categories, images, and the initial pricing. It serves as the authoritative catalog entry that binds together variant specifications, reviews, and customer interactions under a single recognizable identity.

### Online Product

As an active entity, the online product represents the live digital catalog item exposed to shoppers for continuous browsing and purchasing. It functions as a commerce item that draws directly from the seller inventory pool, mapping conceptual merchandise to active stock availability. Every online product reflects the current state of the seller inventory, ensuring that the digital catalog item remains synchronized with physical or virtual restocking efforts. This dynamic presence allows the commerce item to participate actively in search results and category displays.

### Product Listing Basis

The product listing basis establishes the fundamental criteria a product must satisfy to be introduced into the platform's digital catalog. This basis acts as the gatekeeper for catalog integrity, guaranteeing that all presented merchandise items possess valid, non-empty identifiers and financial references. Without meeting this product listing basis, an entity cannot function as a purchasable online product. The foundation relies strictly on the provision of a clear Product.product name and a defined Product.base price to ensure all catalog entries are standardized, transparent, and ready for customer evaluation.

## ProductVariant Concept

The ProductVariant concept defines a specific, purchasable version of a Product, distinguished by unique combinations of options such as color or size. It bridges the conceptual difference between a general Product and the actual physical stock available for delivery. Key business attributes include the SKU code, offering a unique identification string for precise inventory tracking, and the stock quantity, representing the exact number of units currently available. This concept allows a single Product listing to cater to diverse customer preference requirements. Business rules mandate that a Product is only actively purchasable if it possesses at least one variant with available stock, otherwise it is displayed as unavailable.

### Concept Overview

The ProductVariant concept defines the specific, purchasable version of a Product within the e-commerce domain. It bridges the gap between a general catalog listing and the concrete physical units available for delivery. From a business-meaning perspective, it establishes the exact configuration a Customer selects to acquire. The core attributes include the SKU code, providing a unique identifier for internal tracking, and the stock quantity, representing the exact number of physical units currently available. This concept organizes merchandise into distinct stock configurations that can be independently managed.

### Productvariant

The productvariant represents the definitive configuration that transforms a general catalog listing into a tangible, orderable item. Through its variant definition, it serves as the specific stock unit available for commerce, directly embodying a distinct purchasable stock entity. This specific variant definition ensures that every transactional process explicitly targets the exact physical units a Customer intends to acquire. By clearly delineating the path from broad product details to a precise purchasable stock unit, the system maintains rigorous inventory accuracy and reliable fulfillment pathways.

### Product Variation and Variant Attributes

Product variations allow a Seller to present diverse consumer choices under a single Product via alternative option variant configurations, such as varying colors or sizes. Each product variation functions as an independent inventory unit, maintaining its own separate stock levels rather than drawing from a shared pool. The variant attributes capture the precise characteristics of that specific configuration. This attribute-based distinction ensures Customers can clearly evaluate the exact options, pricing, and availability of their preferred item before selecting it for purchase.

### Stock Availability

Stock availability dictates the active transactional status of a product variant based on its physical stock quantity. A variant is considered available for commerce only when its stock quantity is greater than zero. If the stock quantity falls to zero, the variant transitions to an out-of-stock state and becomes unavailable for cart addition or checkout. Even when out of stock, the relevant variant remains visible in the digital catalog to inform customer interest, awaiting physical inventory replenishment.

## Category Concept

The Category concept organizes Products into a logical, hierarchical framework to facilitate easy browsing and discoverability for customers. It represents the digital shelving system used to group related merchandise together. The essential attributes are the category name, providing human-readable labels for specific sections of the mall, and the category level, which denotes its position within the hierarchy, allowing for one level of subcategories. Business rules enforce strict hierarchy limits to maintain navigational clarity and prevent overly complex product trees. This concept is fundamental to platform navigation, filtering mechanisms, and the overall visual structure of the product catalog.

### Concept

### Concept

The **concept** of grouping merchandise defines the fundamental organizational framework within the ecommerceMall **domain**, serving as the primary method for structuring the digital catalog. Its central **business-meaning** lies in creating a coherent and navigable environment that allows customers to seamlessly explore available products rather than sifting through a disorganized inventory. The core **attributes** of this concept establish the foundational identity required to classify and manage merchandise effectively. By defining a logical structure, it ensures that the platform's extensive product inventory is mapped onto a clear and systematic layout, anchoring the user's journey from the moment they enter the store.

### Category

### Category

The **category** entity functions as the essential **digital shelving** solution used to physically and virtually organize all merchandise across the ecommerceMall platform. It dictates how the marketplace maintains its overall **mall organization**, ensuring that goods are systematically placed into logical groupings. This entity directly drives **product navigation** by acting as a virtual aisle where customers can view curated collections of related items. It provides the primary landing point for user exploration, enabling discovery through thematic browsing without the need for direct searching.

### ### Category Attributes

Each classification possesses two distinct **category attributes** that define its exact identity and structural placement within the system. The primary element is the **Category.category name**, offering a human-readable label for the merchandise group, while the secondary element is the **Category.category level**, denoting the entity's specific depth and position relative to its parent groups. These two identifiers establish the **category hierarchy**, enforcing a strict limit of exactly one level of nesting so that parent groups can contain child groups without creating complex multi-tier branches. This dedicated identifier structure actively enables effective **product grouping**, ensuring merchandise is clustered clearly under a **subcategory structure** for precise classification.

### Hierarchical Classification

### Hierarchical Classification

The ecommerceMall platform enforces a strict **hierarchical classification** methodology, ensuring that all merchandise grouping follows a clear parent-child relationship where broader groups define overarching themes and nested groups refine the focus. This structured approach is critical to maintaining a clean **digital catalog structure**, preventing disorganized data sprawl and ensuring that the storefront remains consistently navigable for all user traffic. The **hierarchical classification** dictates how the catalog scales, providing a predictable top-down pathway that organizes broad sections into precise shopping targets while preserving an intuitive browsing experience.

## Order Concept

The Order concept represents the complete commercial transaction established between a Customer and one or more Sellers. It serves as the overarching record for a shopping event, consolidating all selected items into a unified financial agreement. Key business attributes include the order number, offering a unique reference code for tracking and customer support, and the total price, summarizing the comprehensive financial commitment of the entire purchase. This concept derives its overall fulfillment status dynamically based on the collective statuses of its individual order items. The Order concept ensures a cohesive view of the Customer's purchase activity from checkout to final delivery, acting as a central commercial hub.

### Concept Overview

The Purchase Entity acts as the fundamental architectural element within the ecommerceMall ecosystem, representing a structured container for capturing mutual shopping agreements. Operating within the digital retail domain, this business entity functions as the primary mechanism for documenting the exchange of goods between shoppers and vendors. Its core responsibilities revolve around organizing scattered purchasing intents into a consolidated, logical framework. Key attributes act as the foundational data points that characterize the transaction, including reference identifiers and financial summaries, which collectively define the nature and scope of the agreement. Conceptually, this element bridges the gap between initial product browsing and final product delivery, establishing a structured boundary that governs how items are tracked and exchanged across the marketplace platform.

### Order and Transaction Record

The Order serves as the definitive record of a commercial transaction, formalizing the binding agreement reached during the checkout phase. It functions as the central anchor for the purchasing workflow, aggregating every selected product variant into a single, cohesive document that dictates fulfillment logistics. The core of this record is its unique reference identifier, which ensures precise tracking and dispute resolution. By consolidating line items, shipping destinations, and financial summaries, the record provides a static historical documentation of what was acquired, ensuring complete traceability from the moment purchasing intent is expressed until physical goods reach the logistics provider.

### Total Price and Shopping Event

The total price encapsulates the comprehensive financial commitment of an overall purchase, translating the combined cost of all line items into a singular monetary value agreed upon by the Customer. This aggregated figure represents the complete economic obligation of the shopping event, serving as the definitive benchmark for validating the payment agreement before funds are exchanged. It functions as the core reference point for subsequent financial processing, ensuring that all product pricing, variant adjustments, and applicable fees are accurately reflected in the final sum. By locking this total value at the moment of checkout, the business logic guarantees cost stability, preventing any discrepancies between what the Customer expected to pay and what they are ultimately billed.

### Purchase History Record

From a retrospective standpoint, this entity functions as a comprehensive purchase history record, preserving a detailed archive of a Customer's past commercial engagements. This record provides a transparent audit trail, allowing individuals to revisit previous transactions, verify payment completions, and retrieve details of delivered goods long after the initial purchase has concluded. It chronicles the lifecycle of each customer transaction, mapping out the progression of fulfillment milestones such as dispatch, delivery confirmation, and any subsequent resolution requests. By maintaining an enduring repository of these historical interactions, the platform ensures that shoppers and administrators alike have reliable access to transactional data, facilitating efficient support, financial reconciliation, and long-term purchasing behavior analysis.

## OrderItem Concept

The OrderItem concept represents a single line within an Order, corresponding directly to a specific ProductVariant and the quantity purchased by the Customer. It serves as the atomic unit of a transaction, capturing the exact item exchanged and its respective fulfillment progress. Core business attributes are the quantity ordered, defining the exact number of units of that variant involved in the agreement, and the item status, tracking the independent progress of that specific line. Business rules allow an overarching Order to contain multiple distinct OrderItems, each corresponding to a different seller, which enables independent shipping and refund workflows. The OrderItem concept is the primary driver for fulfillment tracking and individual item disputes.

### Core Concept and Business Meaning

The OrderItem concept serves as the fundamental building block within the ecommerceMall platform's domain, representing a specific business agreement to purchase a precise quantity of a single ProductVariant. In terms of its business-meaning, it bridges the overarching commercial Order with the physical goods awaiting dispatch. The defining attributes of this concept are the quantity ordered, which dictates the exact number of units involved in the transaction, and the item status, which tracks the individual progress of that line against the broader agreement.

### Order Component and Single Variant Purchase

Within the structure of an overarching Order, an orderitem functions as a distinct order component, isolating each unique product selection into its own specific transaction component. This architecture guarantees that a single variant purchase is handled with absolute precision, separating it from other purchases within the same transaction. By treating each order item as its own component, the system facilitates independent management for distinct items from different sellers.

### Order Fulfillment Unit and Atomic Line Item

The item operates as the primary order fulfillment unit for the logistics network, functioning as an atomic order unit that dictates how physical goods are grouped into shipments. It represents a consolidated purchased line item; for instance, if a customer buys multiple units of the same variant, they are combined into one order line item. This distinct fulfillment piece is strictly tied to a specific seller, enabling multiple items from a single seller to be bundled into a single physical shipment.

### Fulfillment Status and Partial Item Tracking

The fulfillment status of a broader purchase is dictated independently by each component within the order. The specific value of item status enables sophisticated partial item tracking, allowing the ecommerceMall platform to display that some items in a transaction are fully delivered while others are still awaiting dispatch. This mechanism is critical for multi-vendor transactions, where distinct fulfillment status states coexist concurrently as different sellers handle their respective parts of the broader agreement.

## Shipment Concept

The Shipment concept represents a physical package containing one or more OrderItems being dispatched from a Seller to a Customer. It serves as the logistics container that groups OrderItems based on the seller's internal packing and dispatch strategy. Essential business attributes include the tracking number, providing the unique identifier for the carrier's physical delivery route, and the carrier name, identifying the external logistics service provider. This concept dictates when and how purchased items physically move away from the seller and into the delivery network. The Shipment concept is critical for providing real-time visibility to the customer and triggering delivery status confirmations after a set timeout period.

### Concept

The concept acts as the foundational logistics entity encompassing the digital-to-physical handover within the ecommerceMall business domain. Its business-meaning is to formalize the structural bridge between a confirmed commercial agreement and the tangible movement of goods. The attributes of this high-level concept encompass the overarching metadata required to anchor the delivery process, ensuring that all subsequent logistical steps remain traceable and legally recorded within the broader e-commerce framework.

### Shipment

The shipment represents the primary mechanism of physical fulfillment, initiated by a seller to carry out the goods dispatch of purchased merchandise. Operating as a shipping container, the shipment logically aggregates distinct purchased items purchased from the same seller into a unified transportable unit. This ensures that items sharing a single commercial origin are bundled together securely, allowing them to transit through the logistics network as a cohesive entity while remaining linked to their originating purchase history.

### Delivery Package

The delivery package refers to the finalized logistical entity produced to fulfill the logistics dispatch requirements, designed to reach the customer's designated physical destination. The shipment attributes—such as delivery routing and internal handling codes—are vital metadata that facilitate smooth transit and handling across logistical stages. Within the commercial structure, the delivery package functions as an order items bundle, tightly associating specific purchased line items into one grouped record, guaranteeing that items enclosed in the physical packaging are tracked collectively until they successfully arrive.

### Carrier Details

Carrier details define the essential external partnership required to execute physical transit, explicitly identifying the third-party logistics service provider responsible for handling the package. This includes recognizing the specific courier, postal service, or freight company engaged for the journey. Tying directly into these carrier details is the tracking information, which provides the unique external routing codes and transit progress markers required for both the customer and the seller to accurately monitor the exact status and location of the package as it moves toward the final point of delivery.

## SellerProfile Concept

The SellerProfile concept encapsulates the public-facing identity and descriptive details of a Seller's shop as experienced by platform customers. It bridges the internal Seller entity with the visual and informational elements required for a storefront. Key business attributes include the shop description, outlining the business's core offerings or brand values, and the logo filename, which references the primary visual branding asset. This concept allows Sellers to present their business professionally and helps Customers establish trust before making purchases. Business rules require that every modification to this profile is captured as a snapshot, ensuring full historical transparency of the shop's evolving identity.

### Concept and Business Domain

The SellerProfile concept resides within the broader vendor management domain of the platform, serving as the essential interface between a Seller's internal commercial operations and the external retail environment. Its primary business-meaning is to translate operational data into a coherent market presence that customers can evaluate. The core attributes of this concept establish the foundational descriptive and visual parameters that define how a merchant is perceived by the shopping community, ensuring a standardized presentation format across all marketplace interactions.

### Storefront Identity and Seller Representation

A complete sellerprofile operates as the ultimate storefront identity for a merchant, consolidating the specific visual and textual markers that form the foundation of their brand identity. This entity acts as the definitive seller representation, effectively linking the backend Seller actor to the frontend Customer browsing experience. By housing the essential commercial attributes, the seller profile ensures that every merchant maintains a consistent and professional presence across product pages, fulfillment records, and public directories.

### Shop Storefront Details and Public Profile

The shop storefront details encompass the comprehensive information layers that construct the public profile available to all registered customers. Seller branding is actively expressed through these details, enabling merchants to articulate their specific market focus and business values. Visual shop details, including associated imagery and layout, fall under this concept, providing a dynamic reflection of the merchant's current catalog presentation. These combined elements project a cohesive image that shoppers rely upon to make purchasing decisions.

### Brand Logo Reference and Shop Reputation

The brand logo reference specifically manages the primary visual asset utilized across the platform to identify the Seller in digital catalogs and transaction records. This distinct visual marker anchors the merchant's image and ensures immediate recognition across different sections of the shopping mall. Customers consistently evaluate this visual element alongside descriptive text to determine the credibility of a merchant. Therefore, the brand logo reference is instrumental in building and maintaining shop reputation, as clear visual markers cultivate consumer trust and sustained market interaction.

## WishlistItem Concept

The WishlistItem concept represents a saved product reference within a Customer's personalized list for future purchase consideration. It serves as a placeholder mechanism allowing shoppers to bookmark specific merchandise. Core business attributes include the wishlist entry id, uniquely identifying the specific saved reference within the customer's list, and the product reference, pointing directly to the catalog item of interest. This concept focuses on tracking the general Product rather than specific variants, allowing customers to monitor pricing and availability easily. Business rules dictate that a WishlistItem is automatically removed by the system if the underlying Product is deleted by the seller, preventing broken references.

### WishlistItem Concept Overview

The WishlistItem concept represents a specific Merchandise item saved by a Customer for later consideration. It functions as the core building block of a Customer's personal shopping list within the e-commerce domain. The business meaning is to support future purchase decisions by allowing shoppers to bookmark desired goods for immediate review or delayed acquisition. Core attributes include the wishlist entry identifier, which uniquely distinguishes this specific saved selection, and the selected product identifier, pointing directly to the catalog item of interest.

### Shopping List and Saved Product Reference

Within the platform, the wishlistitem organizes a Customer's shopping list, maintaining a curated catalog of desired goods for future purchase. The system tracks the wishlistitem primarily as a saved WishlistItem.product reference. This allows the Customer to bookmark a general Product without committing to specific variations immediately, making it easier to compare overall pricing and general availability across multiple items. It provides a convenient staging area before adding items to the active shopping cart.

### Customer Bookmark Mechanism

The customer bookmark functionality is built upon a set of structured wishlist attributes that provide effective saved item tracking. A key wishlist attribute is the product bookmark link, which establishes a direct relationship between the Customer's saved intention and the specific Product entry. By monitoring these wishlist attributes through the platform, customers can maintain a dynamic shopping list that they can review, prioritize, or delete at any point.

### Saved Product Association

The saved product associated with a WishlistItem is the fundamental unit of interest, anchoring the entire tracking mechanism to the actual catalog entry. This ensures that the Customer's intention is always linked to current product data, such as updated descriptions. If the underlying saved product is removed from the platform by the Seller, the system automatically invalidates the corresponding entry from the Customer's shopping list, preventing broken references and maintaining the integrity of the saved items.

## Review Concept

The Review concept captures a Customer's subjective feedback and graded evaluation of a purchased Product. It serves as a community quality signal that informs future shoppers about the merchandise and the seller's performance. The core attributes are the rating score, quantifying the Customer's satisfaction on a defined numeric scale, and the review text, allowing for qualitative insights. This concept links a Customer's completed transaction directly to the public-facing product detail page. Business rules strictly govern review generation, requiring the associated item to reach a delivered status before a customer is permitted to leave feedback or edit its content.

### The Review Concept

The Review concept serves as a foundational mechanism for the domain of customer evaluations within the e-commerce mall. Its primary business-meaning is to capture the definitive outcome of a completed transaction, logically linking a Customer directly to a purchased Product. The core attributes of this entity are the Review.rating score, which provides a standardized, quantified measure of the customer's experience, and the Review.review text, which enables detailed qualitative commentary. These attributes establish the essential data structure required to document and display public-facing opinions across the platform's catalog.

### Community Trust and Subjective Evaluation

In the context of the marketplace, the review mechanism generates and sustains community trust among all shoppers. The subjective review process empowers customers to share their personal experiences, moving beyond seller-provided descriptions to facilitate independent product evaluation. This subjective review acts as a vital quality check, ensuring that the platform relies on genuine user perspectives to inform the buying decisions of future customers, thereby enhancing the overall transparency of the shopping environment.

### Coverage: Customer Feedback

The platform relies on customer feedback specifically in the form of a post-delivery review, ensuring that evaluations are only permitted after the merchandise has reached the purchaser. This structural requirement guarantees the accuracy of the product rating and provides actionable seller feedback to the shop operator. By anchoring the review concept to fulfilled deliveries, the system ensures that customer feedback is grounded in the actual receipt and condition of the goods rather than mere pre-purchase expectations.

### Digital Testimonial and Market Signals

Every submitted entry functions as a permanent digital testimonial that remains intrinsically attached to its corresponding product listing. This digital testimonial serves as a highly visible quality signal for the broader marketplace community, heavily influencing consumer confidence and product visibility. The quality signal generated by these historical records forms the core of the platform's reputation system, allowing shoppers to quickly assess the long-term performance and satisfaction associated with a specific item.

## Snapshot Concept

The Snapshot concept represents an immutable, point-in-time record of any modification made to editable data across the platform. It serves as the historical ledger that ensures accountability, transparency, and dispute resolution capabilities for financial transactions. Key attributes include the modified field, explicitly identifying which piece of data was updated, and the previous value, preserving the exact state of that data prior to the change. This concept operates automatically whenever a user or system applies changes to editable entities like products, orders, or profiles. The Snapshot concept guarantees that past states remain accessible and unalterable, safeguarding against data loss or manipulation.

### Snapshot Concept

The Snapshot concept defines the foundational business approach used across the ecommerceMall to capture data modifications. It represents the business-meaning behind the platform's accountability policy: every editable detail on the platform is permanently recorded whenever it changes. The domain encompasses all entities that require oversight, including product listings, seller profiles, and order details. The system relies on its core attributes, which include the modified field, explicitly identifying the specific data element that was altered, and the previous value, capturing the exact content that existed before the update. This concept establishes the baseline rule that no data modification occurs without a corresponding record.

### Snapshot

A snapshot serves as a precise historical data point within the platform's overall change log. It captures the state preservation requirement for any editable entity on the mall. Each snapshot documents an exact instance of a user action, ensuring the platform maintains a sequential record of all changes. The state preservation mechanism guarantees that a snapshot remains a standalone record of what occurred at that specific moment. This ensures that customers and sellers can rely on a consistent and accurate timeline of all updates applied to their accounts and listings.

### Immutable Ledger

The system maintains all records using an immutable ledger principle, ensuring that every recorded event is permanently archived without the possibility of alteration or deletion. This immutable ledger establishes a trustworthy transaction audit trail for all financial and operational exchanges on the platform. Because commerce requires strict accountability, preserving the previous state is essential for verifying exact conditions at the time of a purchase or agreement. The data preservation capability guarantees that these records remain accessible indefinitely for any dispute resolution, supporting the overarching trust of the platform's commercial activities.

### Historical Record

Within this system, these records function as a permanent historical record that supports the completeness and accuracy of the platform's operations. When administrators, customers, or account owners require verification of past actions, the system provides direct access to these documented events. The historical record acts as an authoritative reference, ensuring that all modifications are accurately documented across the system. This capability reinforces the platform's integrity record by providing transparent, undeniable proof of all data changes, ensuring that both the marketplace community and the administrators can trust the underlying accuracy.

## CancellationRequest Concept

The CancellationRequest concept represents a formal petition initiated to void a specific OrderItem prior to its shipment. It serves as the mechanism to halt pending deliveries and initiate corresponding financial reversals. The core attributes are the cancellation reason, providing the textual justification submitted by the requester, and the request status, reflecting the current state of the petition, such as pending, approved, or rejected. This concept handles the cancellation of individual items independently within a broader order, rather than cancelling the entire order at once. Business rules require seller acknowledgment of the request and trigger automatic inventory restoration upon approval.

### Concept Overview

The concept operates within the e-commerce domain as a formal mechanism to halt pending deliveries and initiate corresponding financial reversals. It serves a clear business meaning by protecting the buyer's ability to withdraw from a specific line item before it enters the shipping pipeline. The key business attributes include the textual justification for the withdrawal and the current state of the petition, such as pending, approved, or rejected. This concept is designed to handle the removal of individual components independently within a broader commercial transaction, preventing the entire order from being halted. It requires seller acknowledgment of the withdrawal and triggers automatic inventory restoration once sanctioned.

### Cancellationrequest Mechanism

The Cancellationrequest mechanism facilitates a precise partial cancellation workflow, enabling a specific item within an order to be removed if it has not yet been dispatched. Through this item cancellation process, the platform supports an order item void operation that targets exact products and their variants, isolating the financial impact of the request. This allows the overarching order to remain completely intact while specific variants are successfully removed from the expected delivery pipeline. It is critical that this mechanism only processes individual line items independently within a broader commercial agreement.

### Cancellation Attributes and Financial Reversal

The cancellation attributes encompass the specific details required to process a buyer's objection, particularly emphasizing how financial adjustments are computed against the original transaction total. Because the pre-shipping void can only be executed on items awaiting dispatch, the financial system is automatically triggered to initiate a payment undo upon approval. The platform automatically calculates a direct purchase reversal corresponding exactly to the variant's price and ordered quantity, ensuring perfect monetary symmetry between the objection and the returned funds.

### Void Request and Lifecycle Management

The lifecycle of a void request is governed by a strict sequence of events that requires active intervention from the seller responsible for the specific line item. Once initiated, the void request enters a pending review phase, where the seller evaluates the stated objection before taking final action. The cancellation lifecycle dictates that the seller must explicitly approve or reject the petition to alter the item's status. If sanctioned, the transaction record is permanently altered in alignment with the void request; if denied, the item remains in active fulfillment until the customer escalates the dispute or the merchant proceeds with the shipment.

## RefundRequest Concept

The RefundRequest concept represents a formal petition initiated to return a delivered OrderItem and recover its financial value. It serves as the post-purchase consumer protection mechanism allowing returns on completed transactions. Key attributes include the refund reason, detailing the customer's justification for the return, and the request status, indicating whether the request is under review, approved, or rejected. This concept manages returns on a per-item basis, allowing other items within the same order to remain unaffected and proceed normally. Business rules define a strict timeframe after delivery during which refund requests are valid, ensuring timely processing.

### RefundRequest Concept and Business Meaning

The RefundRequest concept operates within the commercial dispute domain of the ecommerceMall platform, serving as the designated business-meaning structure for handling satisfied customer grievances. It functions as a data container that captures the necessary details to process a return claim. The core information captured includes a textual refund reason, which outlines the shopper's specific justification, and a request status field, indicating the current disposition of the claim. These fundamental attributes enable the platform to organize and display claims consistently to both shoppers and store operators, establishing a transparent framework for post-purchase satisfaction management.

### Refund Request and Item Return

The entity structures around an item return workflow by mapping a specific claim to its corresponding OrderLine so the platform knows exactly which merchandise is subject to evaluation. The core refund attributes encompass the refund reason, capturing the shopper's explanation, and the reference to the original financial transaction amount. This structure directly supports the platform's payment recovery protocol by defining the exact monetary value that must be returned to the purchaser if the seller validates the claim. The framework ensures that the financial obligation tied to the original purchase is accurately identified and prepared for reversal based on the captured data.

### Purchase Reversal and Customer Protection

This element primarily functions as a customer protection feature, specifically defining the scope of the purchase reversal capability for merchandise that has already reached the buyer. It is strictly reserved for post-delivery return scenarios, distinguishing its boundaries from pre-shipment void procedures. The entire refund lifecycle is governed by a strict seven-day window that opens upon delivery confirmation, establishing a clear temporal frame for when disputes can originate. Once the claim is initiated, it remains in a pending or approved state dictated by the seller's response, ensuring that the system maintains a clear, rule-based timeline for resolving post-receipt financial adjustments.

### Financial Restitution and Petition

The framework establishes the conditions under which financial restitution can be processed as the final outcome of a seller-approved refund petition. When the seller validates the claim, the system triggers the financial restitution procedure to transfer the specific purchased monetary value back to the buyer, effectively recording the reversal of that transaction's financial impact. Crucially, this restitution is bound to a strict one-to-one relationship, applying solely to the single item associated with the approved refund petition. Any remaining transaction components within the broader order proceed independently without monetary adjustment, guaranteeing that fund recovery for one dispute remains isolated from the rest of the purchase.

## AdminRequest Concept

The AdminRequest concept represents a formal submission by an existing platform user seeking elevated administrative oversight privileges. It serves as the governance application process for individuals wishing to join the internal management team. The essential attributes are the requested admin level, specifying the exact target role the user is applying for, and the application reason, providing the justification for the privilege escalation. This concept acts as the entry point for expanding the platform's oversight capacity, always requiring validation by an existing super administrator. The concept ensures that platform governance roles are granted only to vetted and approved individuals.

### AdminRequest Concept

The AdminRequest concept embodies the fundamental concept of an individual's pursuit of elevated platform authority, situated firmly within the e-commerce governance domain. Its business-meaning serves as the critical control mechanism ensuring that oversight responsibilities are only delegated to individuals demonstrating a clear and valid justification for access. The concept is defined by its core attributes, which formally capture the scope of the intended administrative role and the specific rationale behind the escalation. By establishing this structured identity, the platform ensures that any transition from a standard commercial user to a governance participant is deliberate, documented, and traceable, acting as the gateway to the administrative hierarchy.

### Adminrequest Application

The Adminrequest represents the formal instrument used to initiate a privilege application within the platform's ecosystem. It is structured as a dedicated governance application record, defining the parameters of any elevated access request prior to adjudication. This mechanism facilitates a transparent role escalation pathway, serving as the primary oversight request channel through which merchants and customers may formally submit an administrative petition. By maintaining an explicit administrative petition record, the system establishes a standard reference point ensuring that every privilege application is properly queued and categorized under the designated governance application tier.

### Platform Management Application

This concept functions as the centralized platform management application, aggregating all internal role escalation and oversight request initiatives into a unified tracking structure. It dictates the operational topology of the administrative petition process, ensuring that every management application submission aligns with the platform's established hierarchy of authority. Through this platform management application framework, the parameters of each oversight request are structured to allow consistent evaluation, facilitating a controlled role escalation process. It ensures that the administrative petition is fully documented and correctly routed under the appropriate management application layer, establishing the baseline for oversight request tracking.

### Admin Attributes

The essential admin attributes governing this concept are the requested admin level and the application reason. The requested admin level defines the precise boundary of new privileges the applicant seeks, distinguishing between standard oversight and supreme governance capabilities. The application reason provides the mandatory textual context required for the management application to evaluate the legitimacy of the elevated access request. Together, these admin attributes constitute the complete profile of an oversight request submission, serving as the immutable foundation for the administrative petition process and ensuring that all governance application reviewers have the necessary context to assess the request.

## ShippingAddress Concept

The ShippingAddress concept represents a physical destination where a Customer intends to have their purchased goods delivered. It serves as the core logistics data required to finalize a commercial checkout transaction. The primary attributes are the street address, defining the precise physical delivery location, and the postal code, ensuring accurate regional sorting and routing by the delivery carrier. This concept empowers Customers to maintain multiple destination points in their profile and select a default address for convenience. The checkout flow relies entirely on the user selecting a valid ShippingAddress to establish the final delivery promise before payment confirmation.

### Foundational Concept and Attributes

The ShippingAddress concept acts as the primary geographic entity within the ecommerceMall domain. Its business-meaning is to capture the exact physical location required for the execution of commercial transactions on the platform. The entity is built upon two essential attributes: the street address, pinpointing the precise drop-off point, and the postal code, defining the regional sorting boundaries. (Defined in Foundational Concept and Attributes). Together, these baseline data points establish the necessary geographic reference required for the platform to interact securely with Customers.

### Coverage: Shippingaddress

For the designated shippingaddress, the information functions exclusively as the fulfillment address throughout the entire lifecycle of an Order. This location represents the definitive physical delivery destination where all purchased merchandise must ultimately arrive. The internal logistics logistics engine of the platform relies entirely on this location to calculate carrier routing and transit boundaries. If a physical delivery destination is not explicitly provided, the logistics logistics of the system are completely halted, preventing any further merchandise movement.

### Checkout Logistics and Delivery Location

During the checkout logistics phase, the Customer must actively identify a specific delivery location from their profile to proceed with their commercial transaction. The relevant address attributes, specifically the street address and postal code established previously, ensure that the platform correctly processes the checkout logistics requirements. These address attributes guarantee that final shipping logistics calculations are strictly aligned with the customer's chosen delivery location. Once the order is confirmed, the shipping logistics routing is permanently locked to this delivery location.

### Customer Destination Management

From a user perspective, the platform organizes these location records simply as customer destination entries within the Customer's private profile. Each Customer can easily define multiple customer destination points to accommodate various personal and professional drop-off needs. This capability ensures that the preferred customer destination is always readily available for immediate selection during shopping sessions, eliminating the need for repeated data entry and streamlining the overall customer experience.

## InventoryRecord Concept

The InventoryRecord concept represents a specific log entry tracking the historical adjustments to the stock availability of a ProductVariant. It serves as the foundational mechanism for maintaining accurate physical stock levels against digital product listings. Key attributes include the quantity changed, indicating the numeric shift in available stock, and the change category, explaining the specific business event causing the shift, such as restocking, selling, or adjustment. This concept accumulates over time to calculate the real-time active stock quantity of a variant. Business rules dictate that this record strictly tracks individual movements rather than the current total, providing a transparent audit trail for inventory management and reconciliation.

### ### InventoryRecord Concept

The InventoryRecord concept represents a discrete, immutable business entry used to document any shift in the physical availability of a ProductVariant. Serving as the foundational unit of the mall's inventory accounting, its primary business attributes include quantity changed, which quantifies the net numeric increase or decrease to stock, and change category, which defines the underlying commercial event driving the adjustment, such as restocking or order placement. This concept strictly isolates individual movements from running totals, ensuring that every fluctuation in inventory is captured with complete transparency and traceability.

### ### Inventory Record & Stock Tracking

The Inventory Record acts as the core mechanism for continuous stock tracking, bridging the gap between digital product listings and physical warehouse reality. By serving as a detailed physical inventory record, it allows the system to calculate and display the available stock history across the duration of a ProductVariant's lifecycle. This mechanism ensures that the total ProductVariant.stock quantity remains perfectly synchronized with actual business activities. Each record functions as a standalone proof of a stock update, enabling real-time visibility into how physical stock quantities are maintained at any given moment.

### ### Inventory Audit Record & Balance

Acting as a comprehensive inventory audit record, this concept guarantees that every variant balance is fully traceable and mathematically reconciled. It meticulously chronicles every inventory movement occurring within the platform, providing an immutable paper trail for dispute resolution and financial accuracy. By tracking individual stock adjustment log entries with precise numeric shifts and categorized reasons, the system maintains absolute transparency. This approach guarantees that the variant balance reflects the true physical reality by aggregating all historical positive and negative adjustments.

### ### Inventory History & Physical Stock Ledger

The Inventory History establishes an unalterable physical stock ledger for each variant, compiling all historical adjustments into a chronological timeline. Much like a financial ledger, this record serves as a permanent archive detailing the sequence of inventory movements from the initial activation of a product variant through to its potential discontinuation. By preserving a complete record of every stock adjustment log over time, this concept allows relevant parties to review the exact historical context of stock levels. The physical stock ledger ensures that the mathematical difference between sold goods and remaining physical inventory is consistently verifiable.

## SellerApproval Concept

The SellerApproval concept represents the administrative gatekeeping record governing a Seller's application to list products on the marketplace. It serves as the mandatory quality control checkpoint ensuring that only qualified vendors are allowed to operate on the platform. The core attributes are the approval status, showing whether the shop application is awaiting review, approved for active business, or rejected from joining, and the rejection reason, explaining the specific cause of denial if applicable. This concept explicitly dictates whether a Seller's products are visible to the public and allowed to be transacted upon. The concept ensures platform compliance and safety by preventing unauthorized entities from processing payments.

### Concept

In the **ecommerceMall** business **domain**, the primary **concept** defines the qualification gatekeeping mechanism that stands between a standard user and an active online marketplace vendor. Its central **business-meaning** is to serve as the mandatory compliance checkpoint that ensures every entity granted selling privileges adheres to platform safety and quality standards before processing any financial transactions. The core **attributes** of this record include the approval status, indicating the current standing of the applicant (pending, approved, or rejected), and the rejection reason, providing context if an application is denied. This record anchors the entire merchant onboarding process, ensuring that public product visibility and payment processing are strictly limited to vetted vendors.

### Sellerapproval

The **sellerapproval** record operates as the central authority for **vendor gatekeeping**, preventing unauthorized entities from listing products or collecting revenue on the platform. By functioning as a permanent **seller onboarding record**, this entity documents every step of the new merchant's journey from initial account creation through to final administrative decision. It strictly enforces the **vendor qualification** process by holding the applicant in a restricted state until an authorized **admin** performs a full review against the platform's operational standards. No **Seller** can list a single **Product** or interact with the catalog while this record remains in an unapproved state.

### Shop Activation

The **shop activation** workflow is directly governed by the administrative review phase of the qualification record. It dictates exactly when a storefront can transition from a dormant registration into an active business capable of executing commerce. The **vendor application status** clearly maps the applicant's journey through the **merchant approval** pipeline, informing both the Seller and platform staff of the current phase. True **seller account approval** is only granted once the reviewing authority validates the applicant's credentials, explicitly unlocking the Seller's dashboard and allowing their **SellerProfile** and products to be indexed by the catalog search and category views.

### Compliance Gatekeeper

By strictly controlling initial merchant access, this concept acts as the platform's ultimate **compliance gatekeeper**, automatically enforcing policy adherence at the point of entry before any products are published. It maintains a curated **seller registry** of all cleared and permitted business entities, effectively segregating active, verified vendors from unauthorized or non-compliant applicants that are attempting to join the network. This continuous state of enforced compliance ensures that **Customer** transactions remain secure and that the public marketplace catalog only contains offerings from entities that have successfully passed mandatory platform standards.

# Domain Relationships

Describe how concepts relate to each other from a business perspective.

## Conceptual Relationships

Describe how concepts relate to each other in business terms.

### Entity Associations and Singular Belongs-To Links

### Order and Fulfillment Links
An Order establishes a direct **relationship** with a Customer and links to a designated ShippingAddress. An OrderItem **belongs** to an Order, capturing an individual purchased item. Each OrderItem separately belongs to a specific ProductVariant. When fulfillment begins, an OrderItem is shipped within a physical package sent by a Seller, grouping items from the same merchant.

### Catalog and Post-Sale Connections
Catalog navigation relies on a Product **belonging** to the Seller who created it and being placed under a parent Category. A ProductVariant **belongs** to a parent Product, holding specific stock options. Post-delivery actions create strict cross-entity ties. A Review links a Customer directly to a Product to share feedback. When a Seller or Customer modifies editable fields, a **Snapshot is associated** with the original Entity to preserve the previous state for dispute resolution.

### Operational Data Ties
A ShippingAddress **belongs** to a Customer for delivery purposes. An InventoryRecord tracks the remaining ProductVariant.stock quantity of a single ProductVariant. Dispute mechanisms link the involved parties: a CancellationRequest connects an OrderItem to the requesting Customer and an approving Seller. Similarly, a RefundRequest links a delivered OrderItem to its requesting Customer and an authorizing Seller. A SellerProfile describes the storefront identity of a Seller.

### Platform Data Ownership and Aggregations

### Platform Data Ownership and Aggregations
Customer and Seller account boundaries dictate the scope of data **ownership**. A Customer has **ownership** over their purchase history and fulfills purchases at multiple ShippingAddresses. Furthermore, a Customer curates a Wishlist that **has many** saved products for future purchase reviews.

A Seller has **ownership** control over their commercial catalog. A Seller manages a SellerProfile, tracks inventory movements via multiple InventoryRecords, and sends multiple Shipments. A Seller owns numerous Products, and each product manages many ProductVariants.

### Overarching Platform Structures
Platform navigation relies on organizational hierarchies. A Category **has many** Products listed within it, and can also contain multiple subcategories. Administrators oversee platform-wide governance, managing many SellerApproval applications and organizing multiple Categories. Administrative controls extend to overseeing the lifecycle of all Users and enforcing commercial policies across the platform.

## Lifecycle and Retention

Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.

### Coverage: Lifecycle

The lifecycle of a Customer begins upon successful account registration and transitions immediately to an active state, remaining permanently active and retained by the system unless explicitly restricted by an administrative ban. The lifecycle of a Seller begins when they submit an application, transitioning the Seller account to a pending state. An administrative review is required to evaluate the application, resulting in a transition to either an approved, active state or a rejected state. If an account is suspended by an administrator, the Seller remains in a restricted suspended state but retains their existing product history and can continue processing existing orders. All submitted application data is strictly retained within the system until a final approval or rejection decision is enacted by an administrator.

The lifecycle of a Product begins upon creation, assigning a name and Product.base price, and transitions to be available for purchasing once assigned to a category and stocked with at least one variant. Product variants enter an out-of-stock state when their initial ProductVariant.stock quantity drops to zero, rendering them temporarily invisible in customer search results. Additionally, Reviews associated with completed purchases transition from an inactive state to an active, publicly visible state once the corresponding OrderItem reaches a delivered status.

Archival operations for data retention are exclusively managed by the Snapshot concept, which records the exact Snapshot.previous value and modification timestamp for every modification to editable data such as Customer profiles, Seller shop profiles, Products, and Reviews. These archival records are strictly immutable and cannot be removed by any actor, ensuring a permanent historical audit trail is maintained at all times. Upon the finalization of a purchase, the system guarantees the data retention of a complete record of the Order, the involved OrderItems, and the Seller's profile snapshot.

### Coverage: Deletion Policy

The deletion of a Customer account permanently removes their Customer profile and login credentials from the active platform. Successful deletion of a Seller account strictly depends on the absence of active financial obligations; a Seller account must be free of pending orders, shipping obligations, and pending cancellation requests before the system permits the deletion. Once the Seller account deletion is confirmed, their shop profile and branding are completely removed from public access. Both Customer and Seller account deletions are irreversible, meaning no standard platform recovery process is available to restore a deleted account or its profile information.

The deletion of a Product by a Seller causes the immediate removal of the product from all catalog listings. Simultaneously, the system automatically removes the WishlistItem.product reference from every Customer WishlistItem to prevent broken references in customer shopping lists, and permanently voids all associated ProductVariants. Similarly, a Customer is permitted to permanently delete their own submitted Review. These deletion policies immediately remove the specified entities from active commerce views, and none of the platform's active entities support system recovery or un-deletion operations once these actions are finalized.

# Business Categories and State Flows

Business category classifications and state flow definitions.

## Business Category Definitions

Define all business category classifications with their allowed values and descriptions.

### Business Category Classifications

The ecommerceMall platform organizes its commercial ecosystem and catalog structure into distinct logical categories and classification types to facilitate user navigation, dispute resolution, and inventory tracking.

### Marketplace Participant Classifications
The platform distinguishes between operational user roles based on their responsibilities within the commerce ecosystem.

**Customer**
The retail consumer who registers an account to browse the marketplace, manage personal shopping lists, and execute purchases. Customer accounts function as the foundational unit for all purchasing and review activities.

**Seller**
The merchant or shop operator who lists products, manages physical stock, and fulfills orders. Sellers operate under a controlled onboarding process, requiring formal application and administrative approval before they are authorized to actively sell goods on the platform.

**Administrator**
The platform overseer responsible for enforcing marketplace rules, moderating user accounts, onboarding vendors, and overseeing catalog structures.

### Marketplace Catalog Classifications
To facilitate product discovery and browsing, the platform utilizes a structured hierarchical arrangement for merchandise categorization managed by administrators.

**Top-Level Category**
A top-level category acts as the highest level of the digital shelving system. These primary classifications establish the main sections of the shopping mall and hold direct associations with products.

**Subcategory**
A subcategory provides a nested layer of organization directly beneath a top-level category. This single level of nesting supports granular product filtering while maintaining a straightforward navigation structure for customers.

### Transaction Request Classifications
Financial interactions regarding an order are divided into distinct classification types determined strictly by the fulfillment timeline and current status of the associated order items.

**Cancellation Request**
A cancellation request is a pre-shipment petition initiated by a customer to void a specific order item. This classification is exclusively reserved for items that are in a "Paid" status, ensuring that financial recovery can occur before the seller begins the physical shipping process.

**Refund Request**
A refund request is a post-delivery petition initiated by a customer to return a purchased item and recover its financial value. This classification applies strictly to items that have reached a "Delivered" status, allowing returns to be processed safely after the goods have arrived at the customer.

### Inventory Movement Classifications
Physical stock adjustments for Review are categorized based on the specific business event driving the quantity shift, ensuring accurate audit trails for available stock.

**Sale Adjustment**
A sale adjustment represents the automatic deduction of ProductVariant.stock quantity from a variant that occurs when a customer successfully completes a purchase transaction.

**Restock Adjustment**
A restock adjustment represents the addition of physical inventory when a seller replenishes the available quantity of a variant in their warehouse.

**Manual Adjustment**
A manual adjustment represents a deliberate correction to stock levels initiated by a seller to account for physical losses, damaged goods, or system recording errors.

### Allowed Values

The platform employs specific status types and classification levels to track the progression of products, transactions, user permissions, and vendor operations.

### Order and Order Item Status Types
The status of commercial transactions tracks the physical and financial progress of individual items throughout the fulfillment lifecycle.

**Order Item Statuses**
Each line in an order possesses an independent status reflecting its specific fulfillment journey:
- Paid: The customer has successfully completed payment for the item, and it is awaiting shipment by the seller.
- Shipped: The seller has dispatched the item to a carrier, and physical tracking information has been provided.
- Delivered: The item has successfully reached the customer's designated shipping address.
- Cancelled: The item was formally voided prior to shipping by mutual agreement between the customer and seller.
- Refunded: The item was formally returned or financially compensated for after reaching the customer.

**Order Statuses**
The overarching status of an entire order is dynamically calculated by aggregating the collective statuses of its individual order items:
- Paid: All order items within the order are in the "Paid" state.
- Shipped: At least one order item is "Shipped", but no items have achieved "Delivered" status yet.
- Delivered: All order items within the order have successfully achieved "Delivered" status.
- Cancelled: All order items within the order were cancelled prior to their physical shipment.
- Refunded: All order items within the order have been financially returned to the customer.
- Partially Completed: A mixed fulfillment state where some items are delivered while others remain active, shipped, or in a different status.

### Seller Approval and Request Status Types
Operational workflows for vendor onboarding and financial dispute resolution follow standardized approval pipelines.

**Seller Approval Statuses**
The progression of a seller's formal application includes:
- Pending: The seller's application is currently under review by an administrator.
- Approved: Authorization is granted, allowing the seller to actively list products and process transactions.
- Rejected: The application is denied, and a specific justification is recorded for the seller.

**Cancellation and Refund Request Statuses**
Both types of financial petitions share the same seller decision workflow:
- Pending: The request has been submitted by the customer and awaits the seller's decision.
- Approved: The seller has consented to the financial or inventory restoration actions.
- Rejected: The seller has denied the request, and the transaction remains active in its current state.

### Administrative Oversight Levels
Platform governance roles are segmented into hierarchical permission levels to oversee platform health responsibly.
- Regular Administrator: Granted standard moderation powers, including managing seller onboarding applications, enforcing user bans, and maintaining category structures.
- Super Administrator: Granted elevated administrative privileges, including managing other administrators, overseeing grade promotions, and overriding complex financial transactions.

### Category Hierarchy Levels
The digital shelving system relies on a strict two-level structure to organize products.
- Top-Level Category: The primary classification directly containing products, serving as the main browseable section.
- Subcategory: The secondary, nested classification used to refine customer browsing within a parent top-level category.

## State Transitions

Define valid state transition paths for stateful concepts.

### Coverage: State Flow

### Item Sequencing
The platform enforces a mandatory **state-flow** for purchased items across their entire lifecycle. Every item is initialized in the "paid" state immediately upon order completion. From this starting point, an item may **transition** to the "shipped" state once the seller dispatches it. Following verification of receipt, the item **transition**s to the "delivered" state. If a customer petitions for a purchase reversal while the item awaits dispatch, the item is permitted to **transition** directly to "cancelled". Alternatively, an item in the "delivered" state may **transition** to "refunded" if a return authorization is granted.

### Order Status Derivation
The overarching Order derives its progression entirely from its constituent items. The master order **transition**s to "shipped" if any item is dispatched before full delivery. The order reaches "delivered" exclusively when every single item is received. If all items transition to "cancelled" within the order, the parent order itself **transition**s to "cancelled". If the order contains a mixture of completed and refunded items, the master order assumes a "partially completed" classification.

### Seller Approval Sequences
A new seller application initiates its lifecycle in the "pending" state. The application must **transition** through administrative review to reach either "approved" (allowing product listings) or "rejected" (barring marketplace operations). If the application is rejected, the seller may submit a fresh registration petition, resetting the sequence and returning the state-flow back to "pending" for further evaluation.

### Coverage: Workflow

### Delivery Confirmation
The fulfillment **workflow** relies on customer verification or an automated timeout. The customer reviews the shipment tracking information and records manual delivery confirmation. This manual action initiates the final **status-change** for the shipment, locking the delivery as complete. Conversely, if the customer does not confirm within fourteen days, the system **workflow** enforces an automatic **status-change**, moving the shipment directly to delivered to ensure transaction timelines are strictly maintained.

### Cancellation Request
The cancellation **workflow** operates at the individual item level. The customer may submit a petition while the item remains in the "paid" state, providing a written justification. The system records the request as pending for seller evaluation. When the seller responds with acceptance, the **workflow** triggers an immediate **status-change** for the item to cancelled, simultaneously restoring its stock quantities. A rejected response maintains the item's existing sequence, allowing the standard fulfillment process to continue.

### Refund Request
The refund **workflow** permits returns exclusively after an item has reached the delivered phase. Within a mandatory seven-day window following delivery, the customer initiates a return request detailing the reasons. The system registers the petition and awaits seller evaluation. Upon approval, the **workflow** applies a specific **status-change** marking the item as refunded. If rejected, the **status-change** preserves the item's current state, finalizing the original transaction.

### Stock Management
Inventory adjustments operate through an automated **workflow** tied to transactional triggers. Order confirmations automatically deduct from available stock, while sanctioned cancellations and refunds automatically replenish it. When the total available stock drops to zero, the variant applies an "out of stock" **status-change**, restricting availability in customer carts until a manual restock event occurs.