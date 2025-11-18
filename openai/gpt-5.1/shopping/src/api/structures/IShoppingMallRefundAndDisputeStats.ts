import { tags } from "typia";

export namespace IShoppingMallRefundAndDisputeStats {
  /**
   * Summary view of daily refund and dispute statistics for the shoppingMall
   * platform.
   *
   * This DTO is used as the element type in the response body of the
   * administrative endpoint that exposes
   * `shopping_mall_refund_and_dispute_stats` rows over a given date range.
   * Each instance represents a single calendar day’s aggregated metrics for
   * refund and dispute activity, derived from operational tables such as
   * refund requests, payment refunds, and disputes.
   *
   * The schema is read-only and purely analytical. It allows admin and
   * operations dashboards to render time-series charts and tabular reports
   * without exposing raw case details or personally identifiable information.
   * All numeric values are pre-aggregated by backend analytics jobs that
   * populate the underlying snapshot table.
   */
  export type ISummary = {
    /**
     * Business date for which refund and dispute metrics are calculated, in
     * ISO 8601 `YYYY-MM-DD` format.
     *
     * This field is derived from the `stats_date` column in the
     * `shopping_mall_refund_and_dispute_stats` snapshot table. Time is
     * normalized to midnight UTC in the underlying model so that each row
     * clearly corresponds to a single calendar day.
     *
     * Clients typically use this value as the x-axis dimension for
     * time-series graphs and to align refund and dispute data with other
     * daily KPIs, such as order volume or platform revenue.
     */
    statsDate: string & tags.Format<"date">;

    /**
     * Total number of refund requests created on this date.
     *
     * Mapped from the `refund_request_count` column in
     * `shopping_mall_refund_and_dispute_stats`, this value counts all newly
     * opened refund cases regardless of their eventual outcome.
     *
     * Operations and risk teams use this metric to monitor the inflow of
     * new refund workload and to identify abnormal spikes in refund
     * activity that may indicate product issues or potential abuse.
     */
    refundRequestCount: number & tags.Type<"int32">;

    /**
     * Number of refund requests approved on this date.
     *
     * This corresponds to the `approved_refund_request_count` column. It
     * counts refund cases for which a positive decision was made on the
     * given date, independent of when the request was originally opened.
     *
     * Comparing this metric to `refundRequestCount` helps teams understand
     * processing throughput and approval ratios over time.
     */
    approvedRefundRequestCount: number & tags.Type<"int32">;

    /**
     * Number of refund requests rejected on this date.
     *
     * Derived from the `rejected_refund_request_count` column in the
     * snapshot table, this figure captures how many refund cases received a
     * negative decision on the business date.
     *
     * Together with `approvedRefundRequestCount`, this value is used to
     * calculate decision ratios and to monitor changes in refund policy
     * enforcement or dispute resolution behavior.
     */
    rejectedRefundRequestCount: number & tags.Type<"int32">;

    /**
     * Total refunded monetary amount on this date, expressed in the
     * platform’s base currency.
     *
     * This metric maps to the `refunded_amount` column in
     * `shopping_mall_refund_and_dispute_stats`. It aggregates all payment
     * refund operations that were completed on the date, regardless of when
     * the underlying orders or refund requests were created.
     *
     * Finance and risk teams rely on this figure to track the platform’s
     * daily refund exposure and to reconcile it with payment provider
     * reports and accounting systems.
     */
    refundedAmount: number;

    /**
     * Number of refund operations on this date that were partial relative
     * to the original charge.
     *
     * Sourced from the `partial_refund_count` column, this count reflects
     * cases where only a portion of the order or item value was refunded,
     * as opposed to a full refund.
     *
     * This metric is useful for understanding the complexity of customer
     * service interactions and for identifying patterns such as frequent
     * partial refunds on specific products or sellers.
     */
    partialRefundCount: number & tags.Type<"int32">;

    /**
     * Number of refund operations on this date that fully refunded the
     * relevant order or item.
     *
     * This aligns with the `full_refund_count` column in the snapshot
     * table. It counts refund events where the refund amount matches the
     * full eligible amount for the affected order or line items.
     *
     * Comparing `fullRefundCount` to `partialRefundCount` helps
     * stakeholders understand whether refunds are primarily complete
     * cancellations or targeted adjustments.
     */
    fullRefundCount: number & tags.Type<"int32">;

    /**
     * Number of disputes created on this date for any reason.
     *
     * Mapped from the `dispute_opened_count` column, this value counts
     * newly opened disputes across all dispute types (for example, payment
     * disputes, delivery conflicts, or policy violations).
     *
     * Risk and operations teams use this metric to monitor the inflow of
     * high-severity cases that may require manual investigation or
     * cross-team collaboration.
     */
    disputeOpenedCount: number & tags.Type<"int32">;

    /**
     * Number of disputes resolved on this date, regardless of when they
     * were opened.
     *
     * This value corresponds to the `dispute_resolved_count` column in
     * `shopping_mall_refund_and_dispute_stats`. It tracks the throughput of
     * dispute resolution workflows.
     *
     * Comparing this count to `disputeOpenedCount` over time helps assess
     * whether the backlog of open disputes is growing, shrinking, or
     * remaining stable.
     */
    disputeResolvedCount: number & tags.Type<"int32">;

    /**
     * Number of disputes resolved in favor of the customer on this date.
     *
     * Derived from the `dispute_resolved_for_customer_count` column, this
     * metric indicates how many resolved cases had customer-favorable
     * outcomes, such as full refunds or corrective actions against
     * sellers.
     *
     * It is useful for monitoring customer satisfaction trends and for
     * ensuring that platform policies are being applied consistently and
     * fairly.
     */
    disputeResolvedForCustomerCount: number & tags.Type<"int32">;

    /**
     * Number of disputes resolved in favor of the seller on this date.
     *
     * This field maps to the `dispute_resolved_for_seller_count` column in
     * the snapshot table. It counts cases where the seller’s position was
     * upheld, such as disputes where the platform determined that service
     * levels were met and no refund was warranted.
     *
     * Analysts often review this metric alongside
     * `disputeResolvedForCustomerCount` to evaluate balance in dispute
     * decisions and to detect potential biases or policy issues.
     */
    disputeResolvedForSellerCount: number & tags.Type<"int32">;

    /**
     * Average elapsed time in hours between refund request creation and
     * final decision for refunds resolved on this date.
     *
     * This value is taken from the `average_refund_resolution_time_hours`
     * column in `shopping_mall_refund_and_dispute_stats`. It is computed
     * over all refund cases whose final decision (approved or rejected)
     * occurred on the business date.
     *
     * Service teams use this KPI to assess operational efficiency, measure
     * adherence to refund SLAs, and identify trends that may warrant
     * process improvements or staffing adjustments.
     */
    averageRefundResolutionTimeHours: number;

    /**
     * Average elapsed time in hours between dispute creation and resolution
     * for disputes resolved on this date.
     *
     * Mapped from the `average_dispute_resolution_time_hours` column, this
     * metric aggregates the resolution time for all disputes closed on the
     * business date.
     *
     * It is a key indicator for compliance with dispute SLAs and for
     * understanding how quickly serious issues are being addressed.
     * Significant increases may signal capacity constraints, process
     * bottlenecks, or particularly complex cases.
     */
    averageDisputeResolutionTimeHours: number;
  };
}
