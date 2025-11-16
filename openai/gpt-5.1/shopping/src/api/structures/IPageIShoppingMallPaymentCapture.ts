import { IPage } from "./IPage";
import { IShoppingMallPaymentCapture } from "./IShoppingMallPaymentCapture";

export namespace IPageIShoppingMallPaymentCapture {
  /**
   * Paginated list of payment capture summaries for a specific payment
   * transaction.
   *
   * This DTO wraps a page of `IShoppingMallPaymentCapture.ISummary` entities
   * together with pagination metadata so that platform administrators can
   * scroll through capture history associated with a payment transaction.
   * Internally it reflects rows from the `shopping_mall_payment_captures`
   * Prisma model, scoped by the corresponding
   * `shopping_mall_payment_transactions` record, and is typically returned by
   * search endpoints that support filtering by capture status, amount ranges,
   * and capture timestamps.
   */
  export type ISummary = {
    /**
     * Page-level pagination information for the capture list.
     *
     * This object encapsulates metadata such as the current page index,
     * page size limit, total record count, and total page count so that
     * clients can implement paging controls when browsing capture
     * attempts.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of payment capture summary records belonging to the
     * current page.
     *
     * Each element is an `IShoppingMallPaymentCapture.ISummary` instance,
     * which represents a single capture attempt recorded in the
     * `shopping_mall_payment_captures` Prisma model and linked to a parent
     * payment transaction in `shopping_mall_payment_transactions`. These
     * summaries expose key fields such as capture identifier, captured
     * amount, currency, high-level capture status, and minimal parent
     * transaction context for use in administrative lists, reconciliation
     * dashboards, and audit tools.
     */
    data: IShoppingMallPaymentCapture.ISummary[];
  };
}
