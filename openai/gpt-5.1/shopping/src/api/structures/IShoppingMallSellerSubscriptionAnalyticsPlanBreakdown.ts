import { tags } from "typia";

import { IShoppingMallSellerSubscriptionPlan } from "./IShoppingMallSellerSubscriptionPlan";

export namespace IShoppingMallSellerSubscriptionAnalyticsPlanBreakdown {
  /**
   * Aggregated subscription analytics for a single seller subscription plan
   * within a subscription analytics summary.
   *
   * This DTO combines metadata from `shopping_mall_seller_subscription_plans`
   * with aggregated counts and revenue metrics from
   * `shopping_mall_seller_subscriptions` that reference that plan.
   *
   * It is used inside
   * `IShoppingMallSellerSubscriptionAnalytics.ISummary.plan_breakdowns` to
   * help compare plan‑level adoption, churn, and revenue performance.
   */
  export type ISummary = {
    /**
     * Summary information about the subscription plan to which this
     * breakdown row refers.
     *
     * The embedded summary exposes stable identifiers such as plan code and
     * user‑facing labels so that analytics UIs can show plan names without
     * extra lookups.
     *
     * Only the summary projection is included to keep the analytics
     * response payload compact and avoid deep plan configuration nesting.
     */
    plan: IShoppingMallSellerSubscriptionPlan.ISummary;

    /**
     * Number of subscriptions linked to this plan that are included in the
     * analytics time window.
     *
     * Depending on the query semantics, this may count active subscriptions
     * at period end, new subscriptions that started in the window, or all
     * subscriptions that existed at any time during the period.
     *
     * It is a primary indicator of adoption for the corresponding plan.
     */
    subscription_count: number & tags.Type<"int32">;

    /**
     * Number of subscriptions for this plan that are in an active status at
     * the end of the reporting period.
     *
     * This count is typically derived from
     * `shopping_mall_seller_subscriptions` rows referencing this plan where
     * `status` is considered active and `deleted_at` is null.
     *
     * It is useful for understanding current revenue‑generating footprint
     * per plan.
     */
    active_subscription_count: number & tags.Type<"int32">;

    /**
     * Aggregate nominal recurring price amount for all subscriptions on
     * this plan during the reporting period, expressed in the analytics
     * `currency`.
     *
     * This metric is generally based on `price_amount` from
     * `shopping_mall_seller_subscriptions` multiplied by billing
     * occurrences falling in the window.
     *
     * It contributes to the parent summary’s `total_recurring_price_amount`
     * when summed across all plan breakdown rows.
     */
    recurring_price_amount: number;

    /**
     * Total discount amount granted to subscriptions on this plan within
     * the reporting period, expressed in the analytics `currency`.
     *
     * It is derived from `discount_amount` on
     * `shopping_mall_seller_subscriptions` and may include promotional,
     * negotiated, or retention discounts.
     *
     * Business teams can use this value to understand the effective
     * discount rate and margin impact for each plan tier.
     */
    discount_amount: number;

    /**
     * Net subscription revenue amount for this plan in the reporting
     * period, expressed in the analytics `currency`.
     *
     * It is typically computed as `recurring_price_amount -
     * discount_amount`, optionally adjusting for refunds or prorations
     * attributed to this plan.
     *
     * When summed across all plan breakdown rows, this metric should align
     * with the parent summary’s `total_net_subscription_revenue_amount`
     * within rounding tolerances.
     */
    net_revenue_amount: number;
  };
}
