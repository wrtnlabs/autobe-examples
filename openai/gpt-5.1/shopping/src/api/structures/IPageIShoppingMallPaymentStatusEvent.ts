import { IPage } from "./IPage";
import { IShoppingMallPaymentStatusEvent } from "./IShoppingMallPaymentStatusEvent";

export namespace IPageIShoppingMallPaymentStatusEvent {
  /**
   * Paginated list of payment status event summaries describing how a payment
   * transaction’s status has evolved over time.
   *
   * This wrapper DTO is used by administrative and internal tooling endpoints
   * to return a scrollable history of status changes stored in the
   * `shopping_mall_payment_status_events` Prisma model. By combining
   * `IShoppingMallPaymentStatusEvent.ISummary` items with pagination
   * metadata, it enables operators to review audit trails, troubleshoot
   * payment issues, and analyze gateway or system-driven state transitions
   * for a given payment transaction.
   */
  export type ISummary = {
    /**
     * Page-level pagination information for the payment status event
     * history.
     *
     * Contains metadata such as current page index, page size, total number
     * of status events, and total pages so that clients can navigate
     * through long status timelines efficiently.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of payment status event summaries for the requested page.
     *
     * Each element is an `IShoppingMallPaymentStatusEvent.ISummary` record
     * that represents a single status transition drawn from the
     * `shopping_mall_payment_status_events` Prisma model and associated
     * with a parent transaction in `shopping_mall_payment_transactions`.
     * These summaries are used to reconstruct a payment’s lifecycle
     * timeline by exposing key fields such as previous and new status, the
     * time at which the event occurred, and optional administrator context
     * for manual overrides.
     */
    data: IShoppingMallPaymentStatusEvent.ISummary[];
  };
}
