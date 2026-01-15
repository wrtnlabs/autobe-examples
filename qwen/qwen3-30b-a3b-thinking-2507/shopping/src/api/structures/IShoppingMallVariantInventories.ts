import { tags } from "typia";

import { IShoppingMallVariantInventory } from "./IShoppingMallVariantInventory";
import { IShoppingMallProduct } from "./IShoppingMallProduct";

export namespace IShoppingMallVariantInventories {
  /**
   * Search criteria and pagination parameters for fetching product variant
   * inventory records. Supports filtering by product ID, variant ID, and
   * minimum stock levels, with optional pagination and sorting. Designed for
   * sellers to efficiently monitor and manage inventory across product
   * variants.
   *
   * The search filters inventory records to provide relevant stock
   * availability information. Sellers can view inventory health by defining
   * minimum stock thresholds, which helps identify items needing restocking.
   * Pagination allows efficient data loading for large inventory datasets.
   *
   * This object does NOT include any ID fields that would indicate a specific
   * variant, but contains properties to filter the inventory listings.
   *
   * Inventory search parameters are critical for sellers managing product
   * listings in the shopping platform. Proper configuration of these
   * parameters directly impacts the efficiency of daily inventory management
   * operations and the accuracy of stock visibility.
   */
  export type IRequest = {
    /**
     * The page number of results to retrieve (1-based index). A value of 1
     * represents the first page of results. This parameter is used to
     * implement pagination for large result sets.
     *
     * Pagination is essential for efficient data retrieval in inventory
     * management systems, especially when dealing with extensive product
     * variant datasets. By breaking results into manageable pages, sellers
     * can quickly scan inventory status without overwhelming system
     * resources or browser performance.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * The number of items to return per page. The maximum allowed value is
     * 100 to prevent overloading. A default value of 20 is used if not
     * specified.
     *
     * This parameter directly affects data transfer size and response times
     * for inventory operations. The default value of 20 provides an optimal
     * balance between result visibility and performance, minimizing page
     * load times while keeping enough items visible for informed
     * decision-making.
     */
    limit: number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>;

    /**
     * Filter variant inventories by specific product ID. When provided,
     * only inventory records related to this product will be included in
     * results. This allows sellers to view inventory status for a
     * particular product they're managing.
     *
     * Product ID filtering is critical for sellers managing specific
     * products in their catalog. It enables targeted inventory checks
     * without requiring extensive filtering through the full product
     * catalog, improving operational efficiency when managing individual
     * items.
     */
    product_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter variant inventories by specific variant ID. When provided,
     * only inventory records for this product variant will be included.
     * This enables sellers to view the stock level of a specific variant.
     *
     * Variant-specific filtering allows sellers to monitor stock levels for
     * specific product options (color, size, etc.) without navigating
     * through the full catalog. It's particularly valuable during
     * restocking planning for individual variants.
     */
    variant_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Minimum stock level threshold to filter inventory records. Only
     * variants with stock quantity at or above this threshold will be
     * returned. This helps sellers identify inventory that meets their
     * minimum stocking requirements.
     *
     * The minimum stock level setting is a critical business parameter for
     * inventory management. It helps sellers maintain optimal stock levels
     * that balance customer satisfaction (avoiding stockouts) with cost
     * efficiency (avoiding excessive inventory), directly impacting
     * profitability.
     */
    min_stock_level?: (number & tags.Minimum<0>) | undefined;

    /**
     * The field to sort the results by. Valid options include product name,
     * variant name, and current stock quantity. Sorting helps sellers
     * organize inventory records for easy scanning and comparison.
     *
     * Sorting is a performance-critical feature in inventory management
     * where sellers frequently need to identify understocked or high-demand
     * variants. The sorting field directly impacts the effectiveness of
     * inventory analysis and decision-making.
     */
    order_by?: "product_name" | "variant_name" | "current_stock" | undefined;

    /**
     * Sorting direction for the results. 'asc' means ascending order while
     * 'desc' means descending. The default is ascending order, which lists
     * items from lowest to highest for the chosen order_by field.
     *
     * Direction selection works in conjunction with sorting fields to
     * provide sellers with the most useful inventory visibility. Ascending
     * orders typically show lower stock levels first (helping identify
     * restock needs), while descending orders list higher quantities first
     * (useful for identifying overstocked items).
     */
    direction?: "asc" | "desc" | undefined;
  };

  /**
   * Product variant inventory summary used for listing inventory data in
   * seller's dashboard. This type provides essential visibility into stock
   * levels across product variants while minimizing data transfer.
   *
   * It's designed for performance in list views, containing only fields
   * necessary to quickly assess inventory health without requiring full
   * product details. Includes references to the variant and parent product
   * for context.
   *
   * This summary type is used in the
   * '/shoppingMall/seller/variant/inventories' endpoint response to provide
   * efficient views of variant inventory records for sellers.
   */
  export type ISummary = {
    /**
     * Unique identifier for the variant inventory record. This is an
     * immutable system-generated ID used to uniquely identify inventory
     * entries in the database.
     *
     * The ID follows UUID v4 format to ensure global uniqueness and
     * security. It's automatically generated when the inventory record is
     * created and never changes. Clients should never attempt to set or
     * modify this value.
     *
     * This ID serves as the primary key for inventory records and is used
     * in all database queries, API endpoints, and audit logs for inventory
     * management operations.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Current stock quantity for the product variant. Represents the number
     * of units available in the current inventory system.
     *
     * This value is always a non-negative integer (0 or higher). A value of
     * 0 indicates the variant is out of stock. The quantity is updated in
     * real-time as orders are placed and inventory is adjusted.
     *
     * This field is critical for sellers managing product listings as it
     * directly affects visibility in the shopping interface and customer
     * purchase decisions.
     */
    quantity: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * The product variant being tracked in inventory.
     *
     * This is a relationship to the specific product variant that the
     * inventory record represents. It contains essential details about the
     * variant without full composition data (e.g., name, color, size).
     *
     * This reference allows sellers to quickly identify which product
     * variant is affected by the inventory status. It's transformed from
     * the raw variant_id for complete context in listing views.
     */
    variant: IShoppingMallVariantInventory.ISummary;

    /**
     * The parent product to which the variant belongs.
     *
     * This shows the main product the variant is part of (e.g.,
     * 'Smartphone' for a variant like 'Smartphone - Blue - 128GB'). It
     * provides context about the product category and main
     * characteristics.
     *
     * The product reference includes minimal details necessary for listing
     * view, but excludes detailed variant information which is covered
     * separately by the variant reference.
     */
    product: IShoppingMallProduct.ISummary;
  };
}
