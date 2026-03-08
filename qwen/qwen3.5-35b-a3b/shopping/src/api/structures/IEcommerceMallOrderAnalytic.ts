import { tags } from "typia";

export namespace IEcommerceMallOrderAnalytic {
  /**
   * Summary view of order analytics metrics for administrative monitoring and business intelligence. Provides aggregated statistics including order counts by status, fulfillment rates, and average order values within a specified time period.
   */
  export type ISummary = {
    /**
     * Unique identifier for this analytics record.
     *
     * @x-autobe-specification UUID generated on analytics record creation. Unique identifier for each analytics snapshot.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Start date of the analytics period (inclusive).
     *
     * @x-autobe-specification Start date of the analytics period (YYYY-MM-DD format). Used to filter orders within the aggregation window.
     */
    periodStart: string & tags.Format<"date">;

    /**
     * End date of the analytics period (inclusive).
     *
     * @x-autobe-specification End date of the analytics period (YYYY-MM-DD format). Used to filter orders within the aggregation window.
     */
    periodEnd: string & tags.Format<"date">;

    /**
     * Total number of orders within the analytics period.
     *
     * @x-autobe-specification COUNT(*) of all orders within the analytics period. Aggregates order records without filtering by status.
     */
    totalOrders: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Breakdown of orders by their status.
     *
     * @x-autobe-specification Object containing order counts grouped by overall_status enum values: {paid, shipped, delivered, cancelled, refunded, partiallyCompleted}. Each count represents COUNT(*) WHERE overall_status = 'X' within the period.
     */
    statusCounts: {
      paid: number & tags.Type<"int32"> & tags.Minimum<0>;
      shipped: number & tags.Type<"int32"> & tags.Minimum<0>;
      delivered: number & tags.Type<"int32"> & tags.Minimum<0>;
      cancelled: number & tags.Type<"int32"> & tags.Minimum<0>;
      refunded: number & tags.Type<"int32"> & tags.Minimum<0>;
      partiallyCompleted: number & tags.Type<"int32"> & tags.Minimum<0>;
    };

    /**
     * Number of orders that have been shipped or delivered.
     *
     * @x-autobe-specification COUNT where overall_status IN ('shipped', 'delivered'). Represents orders that have been shipped to customers.
     */
    fulfilledOrders: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of orders that were cancelled.
     *
     * @x-autobe-specification COUNT where overall_status = 'cancelled'. Represents orders that were cancelled by customers or sellers.
     */
    cancelledOrders: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of orders that were refunded.
     *
     * @x-autobe-specification COUNT where overall_status = 'refunded'. Represents orders that had refunds processed.
     */
    refundedOrders: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Average order value in currency units.
     *
     * @x-autobe-specification AVG(total_price) for orders with status IN ('shipped', 'delivered'), rounded to 2 decimal places. Represents the average revenue per successful order.
     */
    averageOrderValue: number & tags.Minimum<0>;
  };
}
