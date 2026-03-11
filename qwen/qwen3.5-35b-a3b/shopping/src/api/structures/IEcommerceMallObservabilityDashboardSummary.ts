import { tags } from "typia";

import { IEcommerceMallAdminRequestRequest } from "./IEcommerceMallAdminRequestRequest";

export namespace IEcommerceMallObservabilityDashboardSummary {
  /**
   * Seller activity metrics aggregated across all sellers on the platform. Contains product catalog size and order processing volume.
   */
  export type ISellerMetric = {
    /**
     * Total number of products available across all seller catalogs in the platform.
     *
     * @x-autobe-specification SELECT COUNT(*) FROM ecommerce_mall_products. Computes total product count across all seller catalogs.
     */
    productCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of order items across all orders, representing order processing volume.
     *
     * @x-autobe-specification SELECT COUNT(*) FROM ecommerce_mall_order_items. Computes total order items across all orders.
     */
    orderItemCount: number & tags.Type<"int32"> & tags.Minimum<0>;
  };

  /**
   * Seller approval queue metrics for the observability dashboard. Provides real-time visibility into pending seller approval requests including the count of requests awaiting review, average wait time in days, and details of the 10 oldest pending requests.
   */
  export type ISellerApproval = {
    /**
     * Total number of seller approval requests currently awaiting administrator review.
     *
     * @x-autobe-specification Computed aggregation: COUNT(*) FROM ecommerce_mall_admin_request_requests WHERE request_status='pending'. Integer count of all pending seller approval requests awaiting administrator review.
     */
    pendingCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Average time in days that pending approval requests have been awaiting review. Null if there are no pending requests.
     *
     * @x-autobe-specification Computed aggregation: AVG(DATEDIFF(NOW(), created_at)) in days FROM ecommerce_mall_admin_request_requests WHERE request_status='pending'. Returns null when there are no pending requests to avoid division by zero. Floating-point days value.
     */
    averageWaitTime: number | null;

    /**
     * The 10 oldest pending seller approval requests, ordered by submission date. Each request includes requester details and submission timestamp.
     *
     * @x-autobe-specification Computed aggregation: SELECT * FROM (SELECT id, reason, request_status, created_at, updated_at, CASE WHEN customer_requests_id IS NOT NULL THEN 'customer' ELSE 'seller' END AS requester_type FROM ecommerce_mall_admin_request_requests WHERE request_status='pending' AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 10) sub. JOIN to customer or seller based on requester_type to include full requester details. Returns array of IEcommerceMallAdminRequestRequest.ISummary with 10 oldest pending requests.
     */
    oldestRequests: IEcommerceMallAdminRequestRequest.ISummary[];
  };

  /**
   * Audit metrics summarizing the total number of administrator action audit log entries. Provides visibility into administrative activity levels for security monitoring, compliance tracking, and audit trail analysis.
   */
  export type IAuditMetric = {
    /**
     * Total number of administrator action audit log entries in the system.
     *
     * @x-autobe-specification Computed aggregate: SELECT COUNT(*) FROM ecommerce_mall_admin_audit_logs. Returns total count of all administrator action audit log entries. No JOINs needed - simple count aggregation.
     */
    totalCount: number & tags.Type<"int32">;
  };

  /**
   * Review analytics metrics for the admin observability dashboard, aggregating review data to provide platform-wide insights into customer review activity and moderation status.
   */
  export type IReviewAnalytic = {
    /**
     * Total number of reviews in the system.
     *
     * @x-autobe-specification Computed via SELECT COUNT(*) FROM ecommerce_mall_reviews. Total count of all review records regardless of isActive status.
     */
    totalReviews: number & tags.Type<"int32">;

    /**
     * Average customer rating across all reviews, on a scale of 1 to 5 stars. Null if no reviews exist.
     *
     * @x-autobe-specification Computed via SELECT AVG(rating) FROM ecommerce_mall_reviews. Returns null if no reviews exist, otherwise rounded to 2 decimal places. Scale is 1-5 stars.
     */
    averageRating: number | null;

    /**
     * Number of reviews pending moderation (isActive=false).
     *
     * @x-autobe-specification Computed via SELECT COUNT(*) FROM ecommerce_mall_reviews WHERE isActive=false. Counts reviews that require moderation review.
     */
    pendingModerationCount: number & tags.Type<"int32">;
  };

  /**
   * Product variant alert entry for inventory monitoring dashboard. Represents a specific product variant that has fallen below the safety stock threshold of 10 units, requiring attention for stock replenishment.
   *
   * Each alert entry includes the variant identifier, associated product name for context, current stock quantity, and a status indicator showing the severity level of the stock situation.
   */
  export type IInventoryAlert = {
    /**
     * Unique identifier of the product variant in warning state.
     *
     * @x-autobe-specification Computed from ecommerce_mall_product_variants.product_variant_id field where stock_quantity < 10. Returns UUID format product variant identifiers.
     */
    variantId: string & tags.Format<"uuid">;

    /**
     * Name of the product this variant belongs to, for product identification.
     *
     * @x-autobe-specification Computed via JOIN: ecommerce_mall_product_variants.product_id -> ecommerce_mall_products.id. Returns products.name from joined products table.
     */
    productName: string;

    /**
     * Current available stock quantity for this variant. Values below 10 trigger the alert.
     *
     * @x-autobe-specification Direct mapping from ecommerce_mall_product_variants.stock_quantity field. Values range from 0-9 for variants triggering the alert (stock_quantity < 10).
     */
    stockQuantity: number &
      tags.Type<"int32"> &
      tags.Minimum<0> &
      tags.Maximum<9>;

    /**
     * Stock status severity: 'out_of_stock' (0 units), 'critical' (1-4 units), 'low_stock' (5-9 units).
     *
     * @x-autobe-specification Computed ENUM value derived from stock_quantity: 'out_of_stock' if stock_quantity = 0, 'critical' if 1 <= stock_quantity <= 4, 'low_stock' if 5 <= stock_quantity <= 9.
     */
    variantStatus: "out_of_stock" | "critical" | "low_stock";
  };

  /**
   * System operational status metrics computed from external monitoring services. Provides a comprehensive view of platform health including API status, database pool utilization, payment success rate, cache performance, and overall operational state.
   */
  export type ISystemStatus = {
    /**
     * Overall API service health status indicating if the API endpoints are responding correctly.
     *
     * @x-autobe-specification Computed from external monitoring API health endpoint (e.g., /health) - returns 'healthy' or 'unhealthy' string based on service availability
     */
    apiHealth: string;

    /**
     * API response latency in milliseconds representing the average time to respond to requests.
     *
     * @x-autobe-specification Computed from API monitoring service - measures average response time in milliseconds across all API endpoints
     */
    apiLatencyMs: number;

    /**
     * Database connection pool utilization ratio expressed as a decimal between 0.0 (empty) and 1.0 (full).
     *
     * @x-autobe-specification Computed from database monitoring system - ratio of active connections to total pool size (0.0 to 1.0 scale)
     */
    databaseConnectionPoolUtilization: number;

    /**
     * Payment processing success rate as a decimal ratio between 0.0 (0%) and 1.0 (100%).
     *
     * @x-autobe-specification Computed from payment gateway monitoring API - ratio of successful payment transactions to total attempts (0.0 to 1.0 scale)
     */
    paymentProcessingSuccessRate: number;

    /**
     * Cache hit rate ratio representing what percentage of cache requests result in cache hits.
     *
     * @x-autobe-specification Computed from cache monitoring system - ratio of cache hits to total cache requests (0.0 to 1.0 scale)
     */
    cacheHitRate: number;

    /**
     * System error rate as a decimal ratio between 0.0 (no errors) and 1.0 (all errors).
     *
     * @x-autobe-specification Computed from application monitoring system - ratio of error requests to total requests (0.0 to 1.0 scale)
     */
    errorRate: number;

    /**
     * Number of active server connections currently established.
     *
     * @x-autobe-specification Computed from application server monitoring - current count of active server connections
     */
    activeConnections: number & tags.Type<"int32">;

    /**
     * Overall system operational status indicating if all critical metrics are within acceptable thresholds.
     *
     * @x-autobe-specification Computed boolean - true if apiHealth='healthy' AND databaseConnectionPoolUtilization < 0.9 AND paymentProcessingSuccessRate > 0.95, false otherwise
     */
    isOperational: boolean;
  };

  /**
   * Aggregated breakdown of order counts by their current status. Provides real-time visibility into the distribution of orders across the 5 lifecycle states (paid, shipped, delivered, cancelled, refunded). Used in the admin observability dashboard for monitoring platform order health.
   */
  export type IOrderStatusBreakdown = {
    /**
     * Number of orders currently in paid status.
     *
     * @x-autobe-specification Computed: SELECT COUNT(*) FROM ecommerce_mall_orders WHERE overallStatus = 'paid'. Count of all orders with paid status. Integer >= 0. Updated in real-time as orders transition through their lifecycle.
     */
    paid_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of orders currently in shipped status.
     *
     * @x-autobe-specification Computed: SELECT COUNT(*) FROM ecommerce_mall_orders WHERE overallStatus = 'shipped'. Count of all orders that have been shipped but not yet delivered. Integer >= 0. Updated in real-time as orders transition through their lifecycle.
     */
    shipped_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of orders currently in delivered status.
     *
     * @x-autobe-specification Computed: SELECT COUNT(*) FROM ecommerce_mall_orders WHERE overallStatus = 'delivered'. Count of all orders that have been delivered to customers. Integer >= 0. Updated in real-time as orders transition through their lifecycle.
     */
    delivered_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of orders currently in cancelled status.
     *
     * @x-autobe-specification Computed: SELECT COUNT(*) FROM ecommerce_mall_orders WHERE overallStatus = 'cancelled'. Count of all orders that have been cancelled. Integer >= 0. Updated in real-time as orders transition through their lifecycle.
     */
    cancelled_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of orders currently in refunded status.
     *
     * @x-autobe-specification Computed: SELECT COUNT(*) FROM ecommerce_mall_orders WHERE overallStatus = 'refunded'. Count of all orders that have been refunded. Integer >= 0. Updated in real-time as orders transition through their lifecycle.
     */
    refunded_count: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
