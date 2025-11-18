import { tags } from "typia";

export namespace IShoppingMallSellerSubscriptionAnalyticsStatusBreakdown {
  /**
   * Aggregated subscription analytics for a single subscription status within
   * a seller subscription analytics summary.
   *
   * This DTO groups seller subscriptions from
   * `shopping_mall_seller_subscriptions` that share the same `status` value
   * over the selected reporting period.
   *
   * It is used inside
   * `IShoppingMallSellerSubscriptionAnalytics.ISummary.status_breakdowns` to
   * provide a detailed view of how different states contribute to
   * subscription volume and revenue.
   */
  export type ISummary = {
    /**
     * Subscription status represented by this breakdown row.
     *
     * Values mirror those stored in
     * `shopping_mall_seller_subscriptions.status` and may include
     * `pending`, `active`, `past_due`, `cancelled`, or `expired`.
     *
     * Clients should treat this as an opaque string enum, using a separate
     * mapping layer for localization or display names.
     */
    status: string;

    /**
     * Number of subscriptions currently or historically in this status
     * within the reporting period, depending on the applied filters.
     *
     * This may count subscriptions whose `status` equals this value at the
     * end of the period or subscriptions that transitioned into this status
     * during the window, based on the analytics query definition.
     *
     * It is used to assess prevalence and flow between subscription
     * lifecycle states.
     */
    subscription_count: number & tags.Type<"int32">;

    /**
     * Aggregate nominal recurring price amount associated with
     * subscriptions in this status during the reporting period, expressed
     * in the parent summary `currency`.
     *
     * Typically derived from `price_amount` in
     * `shopping_mall_seller_subscriptions`, multiplied by the number of
     * billing periods while the subscription is in this state.
     *
     * This value helps distinguish revenue potential between active and
     * non‑active statuses.
     */
    recurring_price_amount: number;

    /**
     * Total discount amount granted to subscriptions in this status over
     * the reporting period.
     *
     * Based on `discount_amount` from `shopping_mall_seller_subscriptions`,
     * this figure can reveal where discounts are concentrated across the
     * lifecycle, such as during acquisition (`pending`) or retention
     * (`past_due`).
     *
     * Product and finance teams can use this metric to tune discount
     * strategies per status segment.
     */
    discount_amount: number;

    /**
     * Net subscription revenue amount for this status segment in the
     * reporting period, expressed in the parent summary `currency`.
     *
     * This is typically `recurring_price_amount - discount_amount`,
     * optionally adjusted to account for refunds, prorations, or write‑offs
     * specific to this status.
     *
     * It enables analysis of which subscription states actually contribute
     * to realized subscription revenue.
     */
    net_revenue_amount: number;
  };
}
