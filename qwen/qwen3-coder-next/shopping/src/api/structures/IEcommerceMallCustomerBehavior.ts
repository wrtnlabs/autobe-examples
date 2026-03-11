import { tags } from "typia";

export namespace IEcommerceMallCustomerBehavior {
  /**
   * Request parameters for retrieving aggregated customer behavior analytics. Supports filtering by product categories, time periods, and customer segments, plus pagination and sorting options for dashboard displays and trend analysis.
   */
  export type IRequest = {
    /**
     * Search term to filter products and categories by name.
     *
     * @x-autobe-specification Free-text keyword search across product names and category names.
     */
    search?: string | undefined;

    /**
     * List of category IDs to filter results by specific categories.
     *
     * @x-autobe-specification Array of category UUIDs to filter products by category hierarchy.
     */
    category_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Start date and time for the analytics period (inclusive).
     *
     * @x-autobe-specification ISO 8601 datetime for the start of the analysis period.
     */
    start_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date and time for the analytics period (inclusive).
     *
     * @x-autobe-specification ISO 8601 datetime for the end of the analysis period.
     */
    end_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Customer segment to filter analytics (new, returning, or vip).
     *
     * @x-autobe-specification Customer segment filter: 'new' (first-time buyers), 'returning' (multiple purchases), or 'vip' (high-value customers).
     */
    customer_segment?: "new" | "returning" | "vip" | undefined;

    /**
     * Metric to sort results by (views, purchases, revenue, or avg_order_value).
     *
     * @x-autobe-specification Sort metric: 'views' (product views), 'purchases' (order count), 'revenue' (total sales), or 'avg_order_value' (average order value).
     */
    sort_by?: "views" | "purchases" | "revenue" | "avg_order_value" | undefined;

    /**
     * Sort order direction (ascending or descending).
     *
     * @x-autobe-specification Sort direction: 'asc' (ascending) or 'desc' (descending).
     */
    sort_order?: "asc" | "desc" | undefined;

    /**
     * Page number for paginated results (minimum 1).
     *
     * @x-autobe-specification Page number for pagination (1-indexed, default 1).
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Number of records per page (maximum 100).
     *
     * @x-autobe-specification Maximum records per page (1-100, default 20).
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;
  };

  /**
   * Customer behavior analytics summary containing aggregated metrics about shopping patterns including views, cart additions, purchases, and conversion rates.
   */
  export type ISummary = {
    /**
     * Product identifier
     *
     * @x-autobe-specification Aggregated metric computed from product data.
     */
    product_id: string & tags.Format<"uuid">;

    /**
     * Product name
     *
     * @x-autobe-specification Aggregated metric computed from product data.
     */
    product_name: string;

    /**
     * Product category name
     *
     * @x-autobe-specification Aggregated metric computed from product data.
     */
    product_category: string;

    /**
     * Number of times product was viewed
     *
     * @x-autobe-specification Number of times product was viewed. Computed by counting product view events from analytics tables.
     */
    view_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of times product was added to cart
     *
     * @x-autobe-specification Number of times product was added to cart. Computed by counting cart add events from analytics tables.
     */
    cart_add_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of successful purchases
     *
     * @x-autobe-specification Number of successful purchases. Computed by counting completed orders for this product from analytics tables.
     */
    purchase_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Conversion rate percentage (purchases / views * 100)
     *
     * @x-autobe-specification Conversion rate percentage (purchase_count / view_count * 100). Computed by dividing purchase count by view count and multiplying by 100.
     */
    conversion_rate: number & tags.Minimum<0> & tags.Maximum<100>;

    /**
     * Average order value for this product
     *
     * @x-autobe-specification Average order value for this product. Computed by dividing total_revenue by purchase_count.
     */
    average_order_value: number & tags.Minimum<0>;

    /**
     * Total revenue generated
     *
     * @x-autobe-specification Total revenue generated. Computed by summing order item prices for this product from analytics tables.
     */
    total_revenue: number & tags.Minimum<0>;

    /**
     * Cart abandonment rate percentage
     *
     * @x-autobe-specification Cart abandonment rate percentage. Computed by counting abandoned carts and calculating percentage from total cart add events.
     */
    cart_abandonment_rate: number & tags.Minimum<0> & tags.Maximum<100>;

    /**
     * Time period covered (e.g., '7d', '30d', '90d')
     *
     * @x-autobe-specification Time period covered for the analytics metrics.
     */
    time_period: string;
  };
}
