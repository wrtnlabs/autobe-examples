import { tags } from "typia";

import { IPage } from "./IPage";

export namespace IEcommerceMallAnalytic {
  /**
   * Request parameters for querying and filtering ecommerce analytics dashboard data. Enables flexible business intelligence queries with optional date range filtering, entity-specific filtering (seller, category, product), text search, sorting, and pagination controls.
   */
  export type IRequest = {
    /**
     * Text search term for filtering analytics by order numbers, customer names, product names, or shop names.
     *
     * @x-autobe-specification Text search parameter for discovering relevant metrics. Searches across order numbers, customer names, product names, and seller shop names. When provided, filters the aggregated results to only include entities matching the search term.
     */
    search?: string | undefined;

    /**
     * Optional start date for filtering metrics by creation date (ISO 8601 datetime format, e.g., '2024-01-01T00:00:00Z').
     *
     * @x-autobe-specification Optional start of date range filter (ISO 8601 datetime format). Filters metrics by created_at >= start_date across orders, customers, and products. Used for temporal analysis of business metrics.
     */
    start_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional end date for filtering metrics by creation date (ISO 8601 datetime format, e.g., '2024-12-31T23:59:59Z').
     *
     * @x-autobe-specification Optional end of date range filter (ISO 8601 datetime format). Filters metrics by created_at <= end_date across orders, customers, and products. Used for temporal analysis of business metrics.
     */
    end_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional seller UUID for filtering analytics to a specific seller's shop performance.
     *
     * @x-autobe-specification Optional seller UUID filter. Filters analytics to only include data for the specified seller. Returns seller-specific metrics including their products, orders, and seller profile statistics.
     */
    seller_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Optional category UUID for filtering analytics to a specific product category.
     *
     * @x-autobe-specification Optional category UUID filter. Filters analytics to only include data for products in the specified category. Returns category-level product distribution and metrics.
     */
    category_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Optional product UUID for filtering analytics to a specific product's metrics.
     *
     * @x-autobe-specification Optional product UUID filter. Filters analytics to only include data for the specified product. Returns product-specific review metrics and order history.
     */
    product_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Optional field name to sort analytics results (order_count, revenue, avg_order_value, product_count, customer_count, seller_count, avg_rating).
     *
     * @x-autobe-specification Optional field to sort results by. Valid values: order_count, revenue, avg_order_value, product_count, customer_count, seller_count, avg_rating. When not provided, results are returned in default order.
     */
    sort_field?: string | undefined;

    /**
     * Optional sort direction: 'asc' for ascending or 'desc' for descending.
     *
     * @x-autobe-specification Optional sort direction. Values: 'asc' for ascending, 'desc' for descending. Used in conjunction with sort_field parameter to control result ordering.
     */
    sort_order?: "asc" | "desc" | undefined;

    /**
     * Optional page number for pagination (1-indexed, minimum 1, default: 1).
     *
     * @x-autobe-specification Optional page number for pagination (1-indexed, minimum: 1). When not provided, defaults to page 1. Used with limit parameter to control result set size.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Optional number of items per page (minimum 1, maximum 100, default: 20).
     *
     * @x-autobe-specification Optional items per page limit (minimum: 1, maximum: 100). When not provided, defaults to 20. Controls the maximum number of records returned per page.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Analytics dashboard summary containing aggregated business metrics from all major domain entities.
   *
   * This type represents a comprehensive view of ecommerce statistics including:
   *
   * • **Order Metrics**: Total orders, revenue, average order value, and order status breakdowns
   * • **Product Metrics**: Product count, category distribution, and pricing statistics
   * • **Customer Metrics**: Total customer count and registration trends
   * • **Seller Metrics**: Seller count, approval status distribution, and active seller count
   * • **Review Metrics**: Average rating, total review count, and product-level review distribution
   *
   * All metrics are computed from the underlying domain entities and can be filtered by date range, seller, category, and product to enable targeted business analysis.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this analytics response.
     *
     * @x-autobe-specification Standard pagination metadata for paginated list responses. Referenced from IPage.IPagination schema containing: current (1-indexed page number), limit (max records per page), records (total count), pages (total pages). All fields documented in IPage.IPagination schema.
     */
    pagination: IPage.IPagination;

    /**
     * Analytics metrics data object containing aggregated statistics from orders, products, customers, sellers, and reviews.
     *
     * @x-autobe-specification Analytics data object containing computed metrics:
     *
     * - orders: {totalOrders: INT, totalRevenue: DECIMAL, averageOrderValue: DECIMAL, ordersByStatus: Map<status, count>}
     * - products: {totalProducts: INT, productsByCategory: Map<categoryId, count>, averageProductPrice: DECIMAL}
     * - customers: {totalCustomers: INT, customersByRegistrationDate: Map<date, count>}
     * - sellers: {totalSellers: INT, sellersByApprovalStatus: Map<status, count>, activeSellers: INT}
     * - reviews: {averageRating: DECIMAL, totalReviews: INT, reviewsByProduct: Map<productId, count>}
     *
     * All values are computed via SQL aggregation functions (COUNT, SUM, AVG) with GROUP BY operations. Filtering is applied before aggregation based on request parameters (date range, seller_id, category_id, product_id).
     */
    data: {
      orders: {
        totalOrders: number & tags.Type<"int32">;
        totalRevenue: number;
        averageOrderValue: number;
        ordersByStatus: {
          [key: string]: number & tags.Type<"int32">;
        };
      };
      products: {
        totalProducts: number & tags.Type<"int32">;
        productsByCategory: {
          [key: string]: number & tags.Type<"int32">;
        };
        averageProductPrice: number;
      };
      customers: {
        totalCustomers: number & tags.Type<"int32">;
        customersByRegistrationDate: {
          [key: string]: number & tags.Type<"int32">;
        };
      };
      sellers: {
        totalSellers: number & tags.Type<"int32">;
        sellersByApprovalStatus: {
          [key: string]: number & tags.Type<"int32">;
        };
        activeSellers: number & tags.Type<"int32">;
      };
      reviews: {
        averageRating: number;
        totalReviews: number & tags.Type<"int32">;
        reviewsByProduct: {
          [key: string]: number & tags.Type<"int32">;
        };
      };
    };
  };
}
