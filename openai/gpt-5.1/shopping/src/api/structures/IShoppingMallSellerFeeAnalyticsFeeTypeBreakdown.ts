export namespace IShoppingMallSellerFeeAnalyticsFeeTypeBreakdown {
  /**
   * Aggregated view of fee and tax amounts for a single fee type within a
   * seller fee analytics summary.
   *
   * This DTO groups together all `shopping_mall_seller_fee_charges` rows for
   * a seller that share the same `fee_type` during the selected period,
   * capturing both charge and tax amounts in the common reporting currency.
   *
   * It is used as an element inside
   * `IShoppingMallSellerFeeAnalytics.ISummary.fee_type_breakdowns` to support
   * detailed analysis by business fee category such as transaction
   * commissions, platform service fees, subscription fees, advertising fees,
   * or adjustments.
   */
  export type ISummary = {
    /**
     * Business category of the fee that this breakdown row represents.
     *
     * Values correspond directly to the `fee_type` column on
     * `shopping_mall_seller_fee_charges` and may include categories like
     * `transaction_commission`, `platform_service_fee`, `subscription_fee`,
     * `advertising_fee`, or `adjustment`.
     *
     * Clients should treat this as an opaque string enum driven by backend
     * configuration and should not attempt to localize values without a
     * separate mapping.
     */
    fee_type: string;

    /**
     * Total fee amount for this fee type within the reporting period,
     * expressed in the parent summary `currency`.
     *
     * This value is calculated by summing the `amount` column across all
     * fee charge records matching this `fee_type` and time window.
     *
     * Positive values represent net charges to the seller, while negative
     * values indicate net reversals or credits for this fee category.
     */
    total_fee_amount: number;

    /**
     * Total tax portion for this fee type within the reporting period,
     * expressed in the parent summary `currency`.
     *
     * The backend computes this by summing `tax_amount` for all matching
     * `shopping_mall_seller_fee_charges` rows.
     *
     * This helps finance and compliance functions understand the tax
     * contribution of each fee category separately.
     */
    total_tax_amount: number;

    /**
     * Total amount among this fee type that is recognized as platform
     * revenue in the reporting period.
     *
     * This typically sums `amount` for records of the given `fee_type`
     * where `is_platform_revenue` is true.
     *
     * It allows business stakeholders to understand which fee categories
     * are the primary sources of revenue for the platform.
     */
    platform_revenue_amount: number;

    /**
     * Total amount among this fee type that is classified as pass‑through
     * (non‑revenue) for the platform in the reporting period.
     *
     * This amount is usually the portion of `amount` where
     * `is_platform_revenue` is false, such as third‑party shipping or
     * handling fees.
     *
     * Separating this helps both sellers and finance teams reconcile gross
     * charges versus platform revenue across fee categories.
     */
    non_revenue_pass_through_amount: number;
  };
}
