import { IPage } from "./IPage";
import { IShoppingMallPaymentChargeback } from "./IShoppingMallPaymentChargeback";

export namespace IPageIShoppingMallPaymentChargeback {
  /**
   * Paginated collection of payment chargeback summaries for administrative
   * search screens.
   *
   * This DTO represents a single page of
   * `IShoppingMallPaymentChargeback.ISummary` records returned from the
   * `shopping_mall_payment_chargebacks` domain, combined with standard
   * pagination metadata. It is used as the response body of the `PATCH
   * /shoppingMall/platformAdmin/paymentChargebacks` endpoint, where platform
   * administrators and risk-operations users search and review chargebacks
   * using flexible filters.
   *
   * The schema is optimized for list and dashboard views rather than
   * full-detail inspection of a single chargeback. Detailed information about
   * an individual chargeback is expected to be retrieved via dedicated detail
   * endpoints, while this page type focuses on efficient navigation through
   * large chargeback result sets.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this chargeback search result page.
     *
     * This object follows the shared `IPage.IPagination` structure and
     * contains the current page index, page size, total number of
     * chargeback records that match the applied filters, and the total
     * number of pages.
     *
     * Values are calculated from the criteria supplied in
     * `IShoppingMallPaymentChargeback.IRequest` (such as status filters,
     * date ranges, and transaction references) and allow admin and risk
     * dashboards to render paging controls without recomputing counts on
     * the client side.
     */
    pagination: IPage.IPagination;

    /**
     * List of payment chargeback summary records for the current page.
     *
     * Each element is an `IShoppingMallPaymentChargeback.ISummary`
     * instance, typically backed by a row in the
     * `shopping_mall_payment_chargebacks` Prisma table and enriched with
     * related payment transaction and order information.
     *
     * The array may be empty when no chargebacks satisfy the search
     * criteria, but the `pagination` object will still describe the overall
     * result set so that clients can distinguish between "no results" and
     * an absent response body.
     */
    data: IShoppingMallPaymentChargeback.ISummary[];
  };
}
