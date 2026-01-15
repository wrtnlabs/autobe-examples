import { tags } from "typia";

import { IShoppingMallProductBrand } from "./IShoppingMallProductBrand";
import { IShoppingMallCategory } from "./IShoppingMallCategory";
import { IShoppingMallVariantAttribute } from "./IShoppingMallVariantAttribute";
import { IShoppingMallLocationZone } from "./IShoppingMallLocationZone";

export namespace IShoppingMallVariant {
  /**
   * Summary representation of a product variant for administrative and
   * customer-facing displays.
   *
   * Provides a comprehensive overview of a specific product variant with
   * essential metadata, pricing, availability, and performance metrics.
   *
   * Designed for use in administrative dashboards where quick insights are
   * required, as well as customer interfaces where variant selection is
   * available.
   *
   * Excludes detailed attribute specifications (available in separate
   * endpoints) and system-level data (like variant audit logs) for
   * efficiency.
   *
   * All fields represent reconciled information from multiple sources
   * including inventory systems, pricing engines, product catalogs, and
   * customer engagement platforms.
   *
   * The schema enables responsive displays that load quickly without
   * requiring additional API calls to related entities.
   *
   * For detailed variant configuration or attribute combinations, use the
   * full IShoppingMallVariant type.
   *
   * This summary variant is optimized for list views in administration,
   * product discovery, and product comparison features.
   *
   * Field selections based on essential information needed by administrators
   * and customers without redundancy.
   */
  export type ISummary = {
    /**
     * Unique identifier for the product variant.
     *
     * This UUID is the primary key used to reference this specific variant
     * across all related systems including inventory, pricing, and sales
     * systems.
     *
     * Variants are uniquely identified by this ID both for internal system
     * operations and external API references.
     *
     * Generated as UUID v4 to ensure global uniqueness and avoid collisions
     * across distributed systems.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Stock Keeping Unit code for the product variant.
     *
     * A unique alphanumeric identifier generated for each variant
     * combination to enable unambiguous tracking in inventory, order
     * processing, and warehouse systems.
     *
     * SKU generation follows a pattern of product family code + variant
     * attribute codes to ensure uniqueness and dimensional clarity.
     *
     * Used as the primary reference in external systems and distribution
     * channels.
     *
     * Example: "KBD-MEK-BLK-WIR-TKL" for "Mechanical Keyboard - Black,
     * Wired, Tenkeyless".
     */
    sku: string;

    /**
     * Display name of the product variant.
     *
     * The human-readable name that appears in product listings and
     * customer-facing interfaces.
     *
     * Typically combines the base product name with key differentiating
     * attributes (e.g., 'Mechanical Keyboard - Black, Wired, Tenkeyless').
     *
     * Used in search results, product pages, and order confirmations.
     *
     * Must be unique within the product family to avoid customer confusion.
     *
     * Generated automatically from variant attributes and product base
     * name.
     */
    name: string;

    /**
     * Summary representation of a product variant for administrative and
     * customer-facing displays.
     *
     * Provides a comprehensive overview of a specific product variant with
     * essential metadata, pricing, availability, and performance metrics.
     *
     * Designed for use in administrative dashboards where quick insights
     * are required, as well as customer interfaces where variant selection
     * is available.
     *
     * Excludes detailed attribute specifications (available in separate
     * endpoints) and system-level data (like variant audit logs) for
     * efficiency.
     *
     * All fields represent reconciled information from multiple sources
     * including inventory systems, pricing engines, product catalogs, and
     * customer engagement platforms.
     *
     * The schema enables responsive displays that load quickly without
     * requiring additional API calls to related entities.
     *
     * For detailed variant configuration or attribute combinations, use the
     * full IShoppingMallVariant type.
     *
     * This summary variant is optimized for list views in administration,
     * product discovery, and product comparison features.
     *
     * Field selections based on essential information needed by
     * administrators and customers without redundancy.
     */
    description: string;

    /**
     * Current selling price of this specific variant.
     *
     * The price at which this variant is offered to customers, reflecting
     * any special pricing, discounts, or promotions.
     *
     * May differ from base product price due to variant-specific cost
     * differences (e.g., premium materials, additional features).
     *
     * Price values are synchronized from the pricing management system and
     * updated in real-time.
     *
     * Requires at least two decimal places for currency precision.
     *
     * Calculated by applying the variant pricing rule: base_price +
     * price_delta + promotional_adjustment.
     *
     * Implements multi-currency pricing with automatic conversion based on
     * user location.
     */
    price: number & tags.Minimum<0>;

    /**
     * Baseline price for the product without any variant-specific
     * adjustments.
     *
     * The default price of the parent product before any variant-specific
     * pricing changes are applied.
     *
     * Used as the foundation for calculating variant pricing through the
     * formula: base_price + price_delta + promotional_adjustment.
     *
     * Only modified when the fundamental price of the product changes
     * across all variants.
     *
     * Maintained as a reference point to track pricing history and variance
     * impact.
     *
     * Acts as the authoritative source for pricing consistency across all
     * variants of a product.
     */
    base_price: number & tags.Minimum<0>;

    /**
     * Price adjustment specific to this variant relative to the base
     * product.
     *
     * Represents the monetary value added or subtracted from the base
     * product price to arrive at the final variant price.
     *
     * Positive values indicate premium variants (e.g., higher quality
     * material), negative values indicate discounted variants (e.g.,
     * out-of-season colors).
     *
     * Used for automated pricing calculations rather than storing the final
     * price directly.
     *
     * Allows for easier management of price changes across multiple
     * variants simultaneously.
     *
     * Examples:
     *
     * - +$20: Quartz crystal display variant of a smartphone
     * - -$15: Colorway difference with lower material cost
     * - $0: Standard variant with no special pricing modification
     *
     * Adjustments are applied during product variant creation and can be
     * modified separately from the base price.
     */
    price_delta: number;

    /**
     * Currency code for the variant's pricing.
     *
     * ISO 4217 three-letter currency code representing the currency in
     * which this variant is priced and sold.
     *
     * May differ from the store's default currency in international markets
     * or multi-currency stores.
     *
     * Ensures accurate pricing display and financial reconciliation across
     * different regions.
     *
     * Used in payment processing and financial reporting systems.
     *
     * Examples: USD, EUR, GBP, JPY, CAD, AUD, CHF, AUD, HKD.
     *
     * Price stored as numeric value with currency code separately to
     * support multi-currency operations and exchange rate adjustments.
     */
    currency: string;

    /**
     * Current quantity of this variant available for sale.
     *
     * The actual physical stock count available in the warehouse or
     * distribution center.
     *
     * Updated in real-time as orders are placed and inventory is received.
     *
     * Affects product availability status and may trigger automated
     * restocking alerts when below threshold.
     *
     * Excludes reserved inventory for pending orders and backorders.
     *
     * When at zero, variant is typically marked as out of stock in customer
     * interfaces.
     *
     * Synced with warehouse management systems and inventory counting
     * processes to maintain accuracy.
     */
    inventory_quantity: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Quantity of this variant reserved for pending orders.
     *
     * Inventory that has been allocated to active carts or unfulfilled
     * orders but not yet cleared by payment processing.
     *
     * Prevents overselling by ensuring inventory can't be purchased until
     * payment clears.
     *
     * Usually held for a short period (15-30 minutes) before automatic
     * release if payment doesn't complete.
     *
     * Subtracted from available inventory in customer-facing displays to
     * prevent double sales.
     *
     * Managed by the cart session system with automatic cleanup of expired
     * reservations after 30 minutes.
     */
    reserved_quantity: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Minimum threshold quantity at which this variant is considered low
     * stock.
     *
     * When inventory_quantity falls to or below this level, the system
     * triggers low-stock alerts to the product team.
     *
     * Helps prevent stockouts by giving advance notice to replenish
     * inventory before selling out completely.
     *
     * May vary by variant based on sales velocity, lead time for
     * restocking, and criticality of the product.
     *
     * Stock level calculations use: if inventory_quantity <=
     * out_of_stock_threshold, then status = "low_stock".
     *
     * Typical values range from 1-5 for high-velocity items to 10-50 for
     * low-velocity products, configured by product managers based on
     * historical sales data.
     */
    out_of_stock_threshold: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Current availability status of this variant.
     *
     * A computed flag derived from inventory_quantity,
     * out_of_stock_threshold, and product lifecycle stage.
     *
     * In_stock: inventory_quantity > 0 Low_stock: inventory_quantity <=
     * out_of_stock_threshold && inventory_quantity > 0 Out_of_stock:
     * inventory_quantity = 0 Pre_order: product is not yet available but
     * accepting orders Discontinued: product is no longer produced or sold
     *
     * Used to determine display logic in customer interfaces and search
     * result ranking.
     *
     * This status is calculated automatically during inventory updates and
     * product lifecycle changes.
     *
     * Currently in_stock and low_stock status for variants automatically
     * appear in search results and product listings.
     *
     * Out_of_stock, pre_order, and discontinued variants are excluded from
     * search rankings but may still be accessible via direct URLs.
     */
    availability_status:
      | "in_stock"
      | "low_stock"
      | "out_of_stock"
      | "pre_order"
      | "discontinued";

    /**
     * Whether this variant is currently visible to customers.
     *
     * Controls whether the variant appears in product listings, search
     * results, and category pages.
     *
     * Useful for rolling out new variants gradually, or temporarily
     * removing variants without deleting them.
     *
     * When false, the variant will not appear in customer-facing
     * interfaces, even if inventory is available.
     *
     * Can be toggled independently of inventory status for marketing
     * flexibility.
     *
     * Admins can publish/unpublish variants to control product market
     * availability separate from inventory constraints.
     */
    is_published: boolean;

    /**
     * Reference to the parent product this variant belongs to.
     *
     * The unique identifier of the base product entity that this variant is
     * an alternative version of.
     *
     * Variants are always child entities of a parent product and cannot
     * exist independently.
     *
     * Used to group related variants for display and management purposes.
     *
     * Parent product contains shared information (main image, category,
     * brand) while variants provide customization.
     *
     * This relationship enables SKU-to-product association and maintains
     * product lineage across the catalog.
     */
    product_id: string & tags.Format<"uuid">;

    /**
     * Name of the parent product this variant belongs to.
     *
     * The human-readable title of the base product that this variant
     * modifies.
     *
     * Provided here for convenience to avoid additional API calls when
     * displaying variant information.
     *
     * When this variant is displayed in a product listing, the product_name
     * appears as the main title.
     *
     * Note: This is a reference field from the base product's name and is
     * not directly editable on the variant level.
     *
     * Represents the product' primary title as configured by product
     * managers and remains unchanged even when variant names are
     * customized.
     */
    product_name: string;

    /**
     * Brand information associated with the parent product of this variant.
     *
     * This summarizes the brand that manufactures or owns the product line
     * of which this variant is a part.
     *
     * The brand provides context for product quality, reputation, and
     * target market.
     *
     * This object contains the essential brand information needed for
     * customer-facing displays without requiring additional lookups.
     *
     * Projection of the parent product's brand information.
     *
     * Includes brand ID, name, logo URL, and description for a complete
     * brand context.
     *
     * Brand information is inherited from the parent product and serves as
     * trust signal during product discovery and sales conversion.
     */
    product_brand: IShoppingMallProductBrand.ISummary;

    /**
     * Primary category classification of the parent product for this
     * variant.
     *
     * The main category under which this product and its variants are
     * organized in the catalog.
     *
     * Used for navigation, filtering, and search indexing to help customers
     * discover products.
     *
     * May differ from secondary categories which provide additional
     * classification.
     *
     * Includes category ID, name, slug, and hierarchy path to enable full
     * taxonomy representation.
     *
     * Provides critical context for product positioning and market
     * segmentation.
     *
     * Category assignment is managed by product managers and drives the
     * product's placement in the site's information architecture.
     */
    product_category: IShoppingMallCategory.ISummary;

    /**
     * List of attributes that distinguish this specific variant from
     * others.
     *
     * Each attribute represents a configurable feature of the product that
     * creates this unique variant combination.
     *
     * Examples include color, size, material, capacity, or connectivity
     * options.
     *
     * This information enables customers to understand the precise
     * characteristics of this variant.
     *
     * Attributes are standardized across variants for consistency and
     * ensure accurate search filtering.
     *
     * Contains attribute ID, type, name, value, and display formatting.
     *
     * Only includes attributes that are actually configured for this
     * variant.
     *
     * Used in product comparison tools, filtering systems, and variant
     * selection interfaces to allow customers to distinguish between
     * product options.
     */
    variant_attributes: IShoppingMallVariantAttribute.ISummary[];

    /**
     * Number of distinct attribute combinations available for this product.
     *
     * The total count of all possible variations that can be created from
     * this product's configurator.
     *
     * Provides customers insight into the breadth of choices available for
     * this product line.
     *
     * Used in automated merchandising and promotional strategies to promote
     * products with high configurability.
     *
     * Calculates as: multiply counts of each attribute's option values.
     *
     * This is a calculated field based on the predefined attribute values
     * and does not change with inventory.
     *
     * Example: If a product has 3 colors, 4 sizes, and 2 finishes,
     * available_options_count = 3 × 4 × 2 = 24.
     */
    available_options_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of customer reviews received for this specific variant.
     *
     * Counts all published reviews directly associated with this variant.
     *
     * Used to calculate the aggregate rating and to signal product
     * popularity and social proof.
     *
     * Reviews are only counted from verified purchases of this exact
     * variant.
     *
     * Helps customers assess quality and reliability through peer feedback.
     *
     * May be used in ranking search results and product recommendations.
     *
     * Managed through content moderation system to ensure authenticity and
     * compliance with review guidelines.
     */
    reviews_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Average customer rating for this specific variant.
     *
     * The mean value of all numeric ratings provided in customer reviews
     * for this variant.
     *
     * Ratings are on a 1-5 scale and are calculated with precision
     * (allowing decimal values).
     *
     * A high average rating is a strong indicator of customer satisfaction
     * and product quality.
     *
     * Used in product ranking, featured placements, and purchase decision
     * support.
     *
     * Only reviews with numeric ratings contribute to this calculation.
     *
     * Implemented using weighted average algorithm that considers review
     * age, reviewer reputation, and verified purchase status.
     */
    average_rating: number & tags.Minimum<0> & tags.Maximum<5>;

    /**
     * Total number of units sold for this variant across all time.
     *
     * Counts completed orders for this specific variant since its release.
     *
     * Key performance indicator for market demand and inventory planning.
     *
     * Used to identify top-selling variants for promotional emphasis and
     * stock optimization.
     *
     * Excludes canceled orders and returns in the count.
     *
     * Syncs with daily sales analytics system and is recalculated nightly
     * based on confirmed orders.
     */
    sales_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Algorithmic score determining this variant's prominence in search and
     * recommendations.
     *
     * A composite metric calculated from multiple factors including sales
     * velocity, review count, rating, inventory levels, and freshness.
     *
     * Used by the search and discovery engine to rank variants in search
     * results and recommendation lists.
     *
     * Higher scores result in better placement in search results,
     * "trending" lists, and "best sellers" sections.
     *
     * Automatically recalculated nightly based on current performance data.
     *
     * Normalized to 0-1 range for consistent ranking across diverse product
     * categories.
     *
     * Formula: 0.4 × (normalized sales) + 0.3 × (normalized ratings) + 0.2
     * × (normalized inventory) + 0.1 × (recent updates).
     */
    visibility_score: number & tags.Minimum<0> & tags.Maximum<1>;

    /**
     * List of predefined tags assigned to this variant for marketing and
     * merchandising.
     *
     * Tags are manually or automatically assigned to categorize variants
     * for promotional purposes, discovery, or categorization.
     *
     * Examples: "hot selling", "new arrival", "best value", "limited
     * edition", "top rated".
     *
     * Used for automated filtering, featured banners, and targeted
     * promotions.
     *
     * Business users can add or remove tags based on marketing strategy.
     *
     * Tags are semantic labels, not searchable keywords - they're used for
     * classification, not search.
     *
     * Generated through a combination of automated analysis (e.g., high
     * sales velocity) and manual curation by marketing team.
     */
    variant_tagged: string[];

    /**
     * Geographic zones where this variant is currently available for sale.
     *
     * Defines the regions or countries where customers can purchase this
     * variant.
     *
     * Used to manage regional availability, compliance requirements, and
     * shipping restrictions.
     *
     * May differ from the parent product's availability zone.
     *
     * Typical zones: "North America", "Europe", "Asia Pacific", "Global".
     *
     * When empty, indicates the variant is available in all regions where
     * the parent product is sold.
     *
     * Managed by compliance and logistics teams to ensure adherence to
     * regional regulations and distribution agreements.
     */
    location_zones: IShoppingMallLocationZone.ISummary[];

    /**
     * Current regulatory compliance status of this variant.
     *
     * Indicates whether this variant meets all legal and safety
     * requirements for sale in its target markets.
     *
     * Compliant: All required certifications and approvals obtained Pending
     * Review: Documentation under assessment Non-compliant: Missing
     * requirements or failed inspections
     *
     * Critical for standardization, international markets, and product
     * accessibility.
     *
     * Module monitors documentation, material safety data sheets, and
     * certifications.
     *
     * Restricted from sale when non-compliant.
     *
     * Compliance status evolves through product lifecycle: Testing →
     * Documentation Submission → Review → Certification → Active
     * Compliance.
     *
     * System integrates with regulatory databases and automatically flags
     * variants with expiring certifications.
     */
    compliance_status: "compliant" | "pending_review" | "non_compliant";

    /**
     * Current lifecycle stage of this variant for production management.
     *
     * Active: Currently produced and available for sale Discontinued: No
     * longer produced but remaining inventory can be sold End of Life:
     * Scheduled for removal from inventory and production Prototype:
     * Development stage not yet ready for sale
     *
     * Used by supply chain and logistics to establish production schedules,
     * reorder policies, and inventory management strategies.
     *
     * Lifecycle status determines inventory policy, manufacturing priority,
     * and accounting treatment.
     *
     * Status transitions are managed by product managers with approval
     * workflows and change tracking.
     */
    production_status: "active" | "discontinued" | "end_of_life" | "prototype";

    /**
     * Search Engine Optimization title for this variant.
     *
     * A tailored title optimized for search engines to improve
     * discoverability.
     *
     * Built from the product name, variant attributes, and key market
     * search terms.
     *
     * Different from the display name in favor of keyword optimization.
     *
     * Example: "Black Mechanical Keyboard Wired Tenkeyless Switches - Hot
     * Swappable".
     *
     * Used in HTML title tags and search engine results.
     *
     * Generated using AI text optimization algorithms that analyze search
     * volume data and competitive positioning.
     *
     * Title length is constrained to 60 characters to ensure full
     * visibility in search engine result pages.
     */
    seo_title: string;

    /**
     * Search Engine Optimization description for this variant.
     *
     * A meta description optimized for search engines that succinctly
     * describes key benefits and specifications.
     *
     * Used in search engine results to entice clicks and improve ranking.
     *
     * Includes target keywords and highlights unique selling points.
     *
     * Maintains character limits for optimal display in search results.
     *
     * Generated automatically from product attributes, key features, and
     * customer benefits, with human review for quality assurance.
     *
     * Limited to 155 characters to ensure complete display in search engine
     * result pages and avoid truncation.
     */
    seo_description: string;

    /**
     * Classification of this variant to support business categorization and
     * marketing.
     *
     * Standard: Default offering in the product line Premium: Higher cost
     * with enhanced features or quality Economy: Lower cost version with
     * simplified features Limited: Available for a restricted time or
     * quantity Seasonal: Available only during specific seasons or
     * holidays
     *
     * Used for pricing strategies, promotional targeting, and inventory
     * segmentation.
     *
     * Marketing team assigns these types based on strategic positioning.
     *
     * Affects display banners, recommendation algorithms, and customer
     * segmentation.
     *
     * Variant type influences which promotional campaigns are eligible,
     * which customer segments receive targeted marketing, and which special
     * pricing rules apply.
     *
     * Criteria for classification are defined by marketing strategy and
     * reviewed quarterly.
     */
    variant_type: "standard" | "premium" | "economy" | "limited" | "seasonal";
  };
}
