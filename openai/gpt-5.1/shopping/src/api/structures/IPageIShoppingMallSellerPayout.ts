import { IPage } from "./IPage";
import { IShoppingMallSellerPayout } from "./IShoppingMallSellerPayout";

export namespace IPageIShoppingMallSellerPayout {
  /**
   * Paginated collection of seller payout batch summaries for administrative
   * and finance tooling.
   *
   * This DTO models a single page of `IShoppingMallSellerPayout.ISummary`
   * records associated with the `shopping_mall_seller_payouts` table,
   * combined with standard pagination information. It is used as the response
   * body of the `PATCH /shoppingMall/platformAdmin/sellerPayouts` endpoint,
   * where platform administrators and finance teams search and review payout
   * batches sent from the platform to individual sellers.
   *
   * The page structure is tailored for grid and dashboard views that require
   * quick scanning of payout identifiers, periods, currencies, amounts, and
   * statuses. Line-level payout items and deeper reconciliation details are
   * exposed by dedicated endpoints, while this page focuses on efficient
   * navigation across potentially large sets of payout batches.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this seller payout search result page.
     *
     * This object conforms to the shared `IPage.IPagination` schema and
     * exposes the current page index, page size, total number of seller
     * payout batches matching the search filters, and the total page
     * count.
     *
     * Values are derived from the criteria supplied in
     * `IShoppingMallSellerPayout.IRequest`, such as seller identifiers,
     * payout status filters, and date ranges, enabling finance and
     * operations dashboards to render paginated payout lists without
     * manually computing record counts.
     */
    pagination: IPage.IPagination;

    /**
     * List of seller payout batch summaries contained in the current page.
     *
     * Each entry is an `IShoppingMallSellerPayout.ISummary` object that
     * represents a single payout batch row from the
     * `shopping_mall_seller_payouts` Prisma table, summarizing the seller,
     * payout period, currency, aggregated amounts, and payout status.
     *
     * The array can be empty when no payout batches meet the specified
     * filters, but the accompanying `pagination` object will still
     * accurately describe the result set so that clients can clearly
     * distinguish between an empty result page and a missing response.
     */
    data: IShoppingMallSellerPayout.ISummary[];
  };
}
