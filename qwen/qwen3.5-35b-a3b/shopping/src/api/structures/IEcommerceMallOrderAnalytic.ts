import { tags } from "typia";

import { IEcommerceMallProduct } from "./IEcommerceMallProduct";
import { IEcommerceMallSeller } from "./IEcommerceMallSeller";

export namespace IEcommerceMallOrderAnalytic {
  /**
   * Request body for querying order analytics and business intelligence reports.
   *
   * This request type accepts filters for date ranges, order statuses, sellers, categories, and pagination parameters to enable targeted analytics queries. All fields are optional, allowing flexible querying from broad overviews to specific segments.
   *
   * **Date Range Filtering**
   * Filter orders by creation date using `start_date` and `end_date` in ISO 8601 format. The date range cannot exceed one year to prevent performance issues.
   *
   * **Status Filtering**
   * Filter by order status values: `paid`, `shipped`, `delivered`, `cancelled`, `refunded`, `partially_completed`. Multiple statuses can be specified to aggregate across states.
   *
   * **Seller, Category, and Customer Filters**
   * Filter orders by seller IDs, category IDs, or customer IDs to analyze specific merchants, product categories, or customer segments. Multiple values can be specified for each filter.
   *
   * **Pagination and Sorting**
   * Control response size with `page` (default 1) and `limit` (default 20, maximum 100). Sort results by `created_at` or `total_price` in ascending or descending order. Cursor-based pagination supported via `cursor` token.
   */
  export type IRequest = {
    /**
     * Filter orders created on or after this date.
     *
     * ISO 8601 datetime format. Used to filter orders by their creation timestamp. Must be within 1 year of end_date to prevent performance issues from large date ranges. Optional for flexible queries.
     *
     * @x-autobe-specification ISO 8601 datetime filter for order creation date. Query: created_at >= start_date. Must be within 1 year of end_date. Optional for flexible querying.
     */
    start_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter orders created on or before this date.
     *
     * ISO 8601 datetime format. Used to filter orders by their creation timestamp. Must be within 1 year of start_date to prevent performance issues from large date ranges. Optional for flexible queries.
     *
     * @x-autobe-specification ISO 8601 datetime filter for order creation date. Query: created_at <= end_date. Must be within 1 year of start_date. Optional for flexible querying.
     */
    end_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Order statuses to include in analytics.
     *
     * Array of status values to filter orders. Valid statuses: paid, shipped, delivered, cancelled, refunded, partially_completed. Multiple statuses can be specified to include orders in multiple states simultaneously.
     *
     * @x-autobe-specification Array of order status enum values for filtering. Query: status IN (statuses). Valid values: paid, shipped, delivered, cancelled, refunded, partially_completed. Multiple values can be specified to aggregate across multiple statuses.
     */
    statuses?:
      | (
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded"
          | "partially_completed"
        )[]
      | undefined;

    /**
     * Filter orders by seller IDs.
     *
     * Array of UUID strings identifying sellers. Only orders containing products from these sellers will be included. Useful for analyzing specific seller performance metrics. All values must be valid UUID format.
     *
     * @x-autobe-specification Array of UUIDs for filtering by seller. Query: JOIN with order_items and products, then WHERE seller_id IN (seller_ids). Returns analytics for orders from these specific sellers. Optional for seller-specific analysis.
     */
    seller_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Filter orders by product category IDs.
     *
     * Array of UUID strings identifying product categories. Only orders containing products from these categories will be included. Useful for analyzing specific product category performance. All values must be valid UUID format.
     *
     * @x-autobe-specification Array of UUIDs for filtering by product categories. Query: JOIN with order_items and products, then WHERE category_id IN (category_ids). Returns analytics for orders containing products from these categories. Optional for category-specific analysis.
     */
    category_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Filter orders by customer IDs.
     *
     * Array of UUID strings identifying customer accounts. Only orders from these customers will be included. Useful for analyzing specific customer segments or VIP order patterns. All values must be valid UUID format.
     *
     * @x-autobe-specification Array of UUIDs for filtering by customer. Query: member_id IN (customer_ids). Returns analytics for orders from these specific customers. Optional for customer segment analysis.
     */
    customer_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Page number for paginated results.
     *
     * 1-indexed page number. Default value is 1. Used together with limit to control the number of records returned per page. Ignored when cursor-based pagination is provided via cursor token.
     *
     * @x-autobe-specification Page number for offset-based pagination. 1-indexed (first page is 1). Default value: 1. Used together with limit for pagination. Ignored when cursor-based pagination is provided.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of records per page.
     *
     * Maximum number of records to return in a single page. Range: 1-100. Default value is 20. Higher limits return more records per page but may impact query performance for large result sets.
     *
     * @x-autobe-specification Number of records per page. Minimum: 1, Maximum: 100. Default value: 20. Used together with page for offset-based pagination. Higher limits return more records per page but may impact performance.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field to sort results by.
     *
     * Sorting field for query results. Options: created_at (order creation timestamp) or total_price (order value). Default is created_at. Used together with sort_order to control result ordering.
     *
     * @x-autobe-specification Field to sort results by. Valid values: created_at (default), total_price. Default: created_at. Used together with sort_order to determine result ordering. Analytics typically sorted by creation date descending.
     */
    sort_by?: "created_at" | "total_price" | undefined;

    /**
     * Sort order direction.
     *
     * Direction for sorting results. Options: asc (ascending) or desc (descending). Default is desc. Used together with sort_by to control the order of returned analytics records.
     *
     * @x-autobe-specification Sort order direction. Valid values: asc, desc. Default: desc. Used together with sort_by to determine result ordering. Default descending order for most analytics queries.
     */
    sort_order?: "asc" | "desc" | undefined;

    /**
     * Cursor token for cursor-based pagination.
     *
     * Pagination cursor token received from previous response. Used to retrieve the next page of results instead of page/limit parameters. Only one of cursor or page/limit should be used in a single request.
     *
     * @x-autobe-specification Cursor token for cursor-based pagination. Used as alternative to page/limit parameters. Provided in previous response pagination metadata. For pagination continuation after first page request.
     */
    cursor?: string | undefined;
  };

  /**
   * Order analytics summary for administrative dashboards and business intelligence reports.
   *
   * Provides aggregated order statistics including order counts, revenue metrics, status distribution, seller performance, and top-selling products. Optimized for efficient pagination and dashboard display without nested object overhead.
   */
  export type ISummary = {
    /**
     * Total number of orders matching the filter criteria.
     *
     * This field represents the complete count of orders after applying any date range, fulfillment status, or other filtering parameters specified in the query. Used for pagination context and summary displays.
     *
     * @x-autobe-specification Computed: COUNT(*) from ecommerce_mall_orders with optional status filters.
     */
    totalOrderCount: number & tags.Type<"int32">;

    /**
     * Total revenue from orders matching filter criteria.
     *
     * Represents the sum of all order total_price values (gross merchandise value) for the selected time period and filters. Does not account for refunds or cancellations - use statusBreakdown to analyze order states.
     *
     * @x-autobe-specification Computed: SUM(total_price) from ecommerce_mall_orders. Sum of all order total_price values after applying filters. Represents the gross merchandise value (GMV) for the selected period.
     */
    totalRevenue: number;

    /**
     * Average order value (AOV) calculated from total revenue and order count.
     *
     * Calculated by dividing totalRevenue by totalOrderCount. Returns 0 when no orders exist (avoids division by zero). Key metric for understanding customer spending behavior and order value trends.
     *
     * @x-autobe-specification Computed: totalRevenue / totalOrderCount when totalOrderCount > 0, otherwise 0. Average value per order for the selected period.
     */
    averageOrderValue: number;

    /**
     * Order counts grouped by fulfillment status.
     *
     * Object containing counts of orders in each fulfillment state: `paid`, `shipped`, `delivered`, `cancelled`, and `refunded`. Helps analyze order lifecycle distribution.
     *
     * @x-autobe-specification Computed: OBJECT with fulfillment_status keys (paid, shipped, delivered, cancelled, refunded) and COUNT(*) values. Groups orders by fulfillment_status and returns count per status.
     */
    statusBreakdown: {
      [key: string]: number & tags.Type<"int32">;
    };

    /**
     * Best-selling sellers ranked by total revenue.
     *
     * Array of seller summary objects representing top performers by revenue generated from orders. Each seller includes identifying information and revenue metrics. Limited to top N results for efficient dashboard display.
     *
     * @x-autobe-specification Computed: ARRAY of IEcommerceMallSeller.ISummary objects joined from ecommerce_mall_orders, ecommerce_mall_order_items, and ecommerce_mall_sellers. Aggregates total_revenue per seller, orders them by revenue DESC, limits to top results.
     */
    topSellers: IEcommerceMallSeller.ISummary[];

    /**
     * Best-selling products ranked by units sold.
     *
     * Array of product summary objects representing top performers by units sold. Each product includes identifying information and sales metrics. Limited to top N results for efficient dashboard display.
     *
     * @x-autobe-specification Computed: ARRAY of IEcommerceMallProduct.ISummary objects joined from ecommerce_mall_orders, ecommerce_mall_order_items, and ecommerce_mall_products. Aggregates units_sold and total_revenue per product, orders by units_sold DESC, limits to top results.
     */
    topProducts: IEcommerceMallProduct.ISummary[];
  };
}
