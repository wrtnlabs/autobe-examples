export namespace IShoppingMallPaymentMethod {
  /**
   * Lightweight representation of a payment method for use in list views and
   * embedded contexts.
   *
   * This summary type includes only essential information needed for display
   * purposes, excluding detailed configuration and processing metadata. Used
   * in scenarios like payment method selection during checkout and display in
   * payment history.
   *
   * Fields match the complete IShoppingMallPaymentMethod type but exclude
   * technical details like processing_fee, created_at, updated_at, and
   * description that are not required for summary displays.
   */
  export type ISummary = string;
}
