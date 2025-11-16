import { IPage } from "./IPage";
import { IShoppingMallRefundTransaction } from "./IShoppingMallRefundTransaction";

export namespace IPageIShoppingMallRefundTransaction {
  /**
   * Paginated collection of refund transaction summaries for administrative
   * search and analysis.
   *
   * This DTO is returned by the `PATCH
   * /shoppingMall/platformAdmin/refundTransactions` endpoint, which queries
   * the `shopping_mall_refund_transactions` table (and related entities such
   * as orders and payment transactions) using flexible filter and sorting
   * criteria. The `pagination` property exposes standard page metadata via
   * `IPage.IPagination`, while the `data` array contains
   * `IShoppingMallRefundTransaction.ISummary` records representing individual
   * refund transactions.
   *
   * Admin dashboards, finance reconciliation tools, and customer support
   * consoles use this page wrapper to browse refund activity across the
   * marketplace. Clients can iterate through pages, inspect key refund
   * attributes at a glance, and then call more specialized endpoints to
   * retrieve detailed information about a specific refund transaction when
   * needed.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of results.
     *
     * This object follows the shared `IPage.IPagination` schema and
     * captures values such as current page index, page size, total record
     * count, and total page count. Admin UIs use this information to drive
     * paging controls when browsing refund transactions.
     */
    pagination: IPage.IPagination;

    /**
     * List of refund transaction summaries in the current page.
     *
     * Each element is an `IShoppingMallRefundTransaction.ISummary` DTO that
     * provides a compact view of a single refund transaction sourced from
     * the `shopping_mall_refund_transactions` Prisma model. These summaries
     * surface identifiers, related order and payment references, refund
     * amounts, currencies, statuses, and initiating actors so that
     * administrators can quickly scan refund activity without loading full
     * detail graphs.
     */
    data: IShoppingMallRefundTransaction.ISummary[];
  };
}
