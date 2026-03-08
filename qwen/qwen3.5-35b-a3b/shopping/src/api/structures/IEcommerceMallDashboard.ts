import { tags } from "typia";

import { IEcommerceMallDashboardAuditLogMetric } from "./IEcommerceMallDashboardAuditLogMetric";
import { IEcommerceMallDashboardInventory } from "./IEcommerceMallDashboardInventory";
import { IEcommerceMallDashboardOrderLifecycle } from "./IEcommerceMallDashboardOrderLifecycle";
import { IEcommerceMallDashboardPerformance } from "./IEcommerceMallDashboardPerformance";
import { IEcommerceMallDashboardReviewAnalytic } from "./IEcommerceMallDashboardReviewAnalytic";
import { IEcommerceMallDashboardSellerApproval } from "./IEcommerceMallDashboardSellerApproval";
import { IEcommerceMallDashboardSystemHealth } from "./IEcommerceMallDashboardSystemHealth";

export namespace IEcommerceMallDashboard {
  /**
   * Query parameters for filtering and paginating the observability dashboard metrics. Controls the time window, actor type, service component, and pagination settings for aggregated system metrics.
   */
  export type IRequest = {
    /**
     * Time window for filtering dashboard metrics.
     *
     * @x-autobe-specification Filter metrics by time window. Valid values: '1h' (1 hour), '6h' (6 hours), '24h' (24 hours), '7d' (7 days), '30d' (30 days), '90d' (90 days), '180d' (180 days), '365d' (365 days). Defaults to '24h' if not specified. Metrics are computed for the selected time window.
     */
    timeRange?:
      | "1h"
      | "6h"
      | "24h"
      | "7d"
      | "30d"
      | "90d"
      | "180d"
      | "365d"
      | undefined;

    /**
     * User type for filtering dashboard metrics.
     *
     * @x-autobe-specification Filter metrics by user actor type. Valid values: 'customer', 'seller', 'admin'. If not specified, includes all actor types in aggregated metrics.
     */
    actorType?: "customer" | "seller" | "admin" | undefined;

    /**
     * Specific user ID for filtering dashboard metrics.
     *
     * @x-autobe-specification Filter metrics by specific user ID (UUID format). If specified with actorType, shows metrics only for that specific user. Optional, if omitted includes all actors.
     */
    actorId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Service component for filtering dashboard metrics.
     *
     * @x-autobe-specification Filter metrics by service component. Valid values: 'payment', 'shipping', 'inventory', 'all'. If 'all' or not specified, aggregates metrics from all services.
     */
    service?: "payment" | "shipping" | "inventory" | "all" | undefined;

    /**
     * Current page number for paginated results.
     *
     * @x-autobe-specification Current page number for paginated results (1-indexed). Must be >= 1. Defaults to 1 if not specified. Only applies to paginated sub-metrics like seller approval queue list.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Maximum records per page for paginated results.
     *
     * @x-autobe-specification Maximum number of records per page (for paginated sub-metrics). Must be between 1 and 100. Defaults to 20 if not specified. Only applies to paginated sub-metrics like seller approval queue list.
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
   * Dashboard summary metrics aggregated from multiple system sources. Provides a comprehensive overview of system health, performance, inventory status, order lifecycle, and review analytics for administrators. All metrics are computed in real-time with near-real-time updates.
   */
  export type ISummary = {
    /**
     * Overall system health status based on error rates and availability metrics. Indicates whether the system is operating normally (green), experiencing issues (yellow), or has critical failures (red).
     *
     * @x-autobe-specification Compute overall system status by aggregating error rates from multiple sources: calculate error_rate from audit log failures and HTTP 5xx response ratios. Status is 'green' if error_rate < 1%, 'yellow' if 1% <= error_rate < 5%, 'red' if error_rate >= 5%. Also monitor system availability by checking uptime metrics and active session health.
     */
    systemHealth: IEcommerceMallDashboardSystemHealth;

    /**
     * System performance metrics including latency percentiles, error rates, and session counts. Provides insight into API response times and system throughput.
     *
     * @x-autobe-specification Extract performance metrics from application logs and monitoring data: calculate p50/p90/p99 latency percentiles for API responses, compute error_rate as (failed_requests / total_requests) * 100, count active_sessions from session table. Aggregate data from access logs and performance monitoring endpoints.
     */
    performance: IEcommerceMallDashboardPerformance;

    /**
     * Inventory status overview including stock levels, low-stock warnings, and total inventory value. Helps identify variants that need restocking and overall product availability.
     *
     * @x-autobe-specification Aggregate variant stock levels from ecommerce_mall_product_variants: count total variants by stock range (0, 1-9, 10-99, 100+), identify low_stock_variants where stockQuantity < 10. Calculate total_inventory_value by summing (stockQuantity * basePrice) across all active variants. Monitor inventory health indicators.
     */
    inventory: IEcommerceMallDashboardInventory;

    /**
     * Seller approval queue metrics showing pending applications and wait times. Tracks the number of sellers waiting for admin approval and helps prioritize review of new seller registrations.
     *
     * @x-autobe-specification Query ecommerce_mall_sellers table filtering by approvalStatus = 'pending': count total pending_seller_requests, calculate average_wait_time as (current_timestamp - createdAt) for pending sellers, fetch oldest_requests by ordering by createdAt ASC and limiting to 5. Provide dashboard visibility into seller onboarding pipeline.
     */
    sellerApprovalQueue: IEcommerceMallDashboardSellerApproval;

    /**
     * Order lifecycle distribution showing how many orders are in each status (paid, shipped, delivered, cancelled, refunded, partially completed). Helps monitor order fulfillment and identify bottlenecks.
     *
     * @x-autobe-specification Query ecommerce_mall_orders table and group by overallStatus: count paid_orders, shipped_orders, delivered_orders, cancelled_orders, refunded_orders, and partially_completed_orders. Calculate order_completion_rate as (delivered_orders / (delivered_orders + cancelled_orders + refunded_orders)) * 100. Provides insight into order fulfillment pipeline.
     */
    orderLifecycle: IEcommerceMallDashboardOrderLifecycle;

    /**
     * Product review analytics including total reviews, average ratings, and distribution across star levels. Helps assess product quality and customer satisfaction trends.
     *
     * @x-autobe-specification Aggregate from ecommerce_mall_reviews table: count total_reviews, calculate average_rating as AVG(rating) with 2 decimal places, count reviews by star level (1-5 stars) for distribution analysis, track newly_submitted this_week by filtering where createdAt >= current_timestamp - 7 days. Provides customer satisfaction insights.
     */
    reviewAnalytics: IEcommerceMallDashboardReviewAnalytic;

    /**
     * Administrator audit log metrics including log entry counts and audit rates. Tracks admin activities for security monitoring, compliance auditing, and administrative oversight.
     *
     * @x-autobe-specification Query ecommerce_mall_admin_audit_logs table: count total_log_entries from last_24_hours and last_7_days, calculate audit_log_rate as total_log_entries / days, identify security_events by filtering action_type for login/logout/admin_access operations. Provides security monitoring and compliance tracking.
     */
    auditLogMetrics: IEcommerceMallDashboardAuditLogMetric;
  };
}
