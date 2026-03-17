import { tags } from "typia";

export namespace IEcommerceMallStatus {
  /**
   * Platform status and health monitoring summary providing real-time overview of ecommerce mall operational condition. Contains platform availability status, order processing metrics by status category, shipment tracking metrics, and overall health score for monitoring dashboards and health check endpoints.
   */
  export type ISummary = {
    /**
     * Current operational health status of the entire platform. Indicates whether the system is operating normally, experiencing partial issues, or has critical failures.
     *
     * @x-autobe-specification Computed value: 'healthy' if all services operational and performance within normal thresholds, 'degraded' if partial issues detected or performance degraded but systems functional, 'unhealthy' if critical failures or complete service outage. Thresholds: healthy >= 95% availability, degraded 80-95%, unhealthy < 80%.
     */
    platformStatus?: "healthy" | "degraded" | "unhealthy" | undefined;

    /**
     * Counts of active orders grouped by their current status. Each key represents an order status and value is the count of orders in that status.
     *
     * @x-autobe-specification Aggregation: SELECT status, COUNT(*) as count FROM ecommerce_mall_orders WHERE status IN ('paid', 'shipped', 'delivered', 'cancelled', 'refunded', 'partiallyCompleted') GROUP BY status. Returns object with status keys and integer counts. Only includes statuses with count > 0.
     */
    orderCounts?:
      | {
          [key: string]: number & tags.Type<"int32"> & tags.Minimum<0>;
        }
      | undefined;

    /**
     * Counts of active shipments grouped by their current status. Each key represents a shipment status and value is the count of shipments in that status.
     *
     * @x-autobe-specification Aggregation: SELECT status, COUNT(*) as count FROM ecommerce_mall_shipments WHERE status IN ('created', 'inTransit', 'delivered') GROUP BY status. Returns object with status keys and integer counts. Only includes statuses with count > 0.
     */
    shipmentCounts?:
      | {
          [key: string]: number & tags.Type<"int32"> & tags.Minimum<0>;
        }
      | undefined;

    /**
     * Overall platform health score from 0 to 100, where 100 represents optimal operation and 0 represents complete failure. Combines service availability and operational efficiency metrics.
     *
     * @x-autobe-specification Composite score (0-100) calculated as: (availabilityPercentage * 0.6) + ((totalOrdersDelivered / totalOrdersPaid) * 100 * 0.2) + ((totalShipmentsDelivered / totalShipmentsCreated) * 100 * 0.2). Scores: 95-100 = excellent, 80-94 = good, 60-79 = fair, <60 = poor. Updated every minute.
     */
    healthScore?: (number & tags.Minimum<0> & tags.Maximum<100>) | undefined;
  };
}
