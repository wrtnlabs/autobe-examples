import { IPage } from "./IPage";
import { IShoppingMallOrderStatusHistory } from "./IShoppingMallOrderStatusHistory";

export namespace IPageIShoppingMallOrderStatusHistory {
  /**
   * Paginated response containing order status history records for audit
   * trail and tracking purposes.
   *
   * This wrapper type encapsulates the complete status transition history for
   * a specific order, providing both the chronological event records and
   * pagination metadata needed for timeline displays and compliance
   * reporting. Used as the response type for status history queries where
   * buyers track order progress, sellers monitor fulfillment workflows, and
   * administrators investigate order issues or disputes.
   *
   * The pagination structure enables efficient navigation through potentially
   * long order histories, especially for orders with complex fulfillment
   * paths involving multiple status changes, cancellations, or refund
   * processes. This is critical for compliance requirements where complete
   * audit trails must be maintained and accessible without performance
   * degradation.
   *
   * Typical use cases include order tracking pages showing delivery progress,
   * customer service interfaces investigating order issues, dispute
   * resolution systems analyzing order timelines, and compliance reporting
   * extracting status change patterns. The filtering capabilities integrated
   * with this paginated response allow searching by specific status types,
   * date ranges, and actors to analyze particular aspects of the order
   * lifecycle for operational analytics and regulatory compliance.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the status history result set.
     *
     * Provides essential information about the current page position within
     * the complete audit trail, total status change records, and navigation
     * capabilities. Includes current page number, page size limit, total
     * record count, and total page count for implementing timeline
     * navigation controls.
     */
    pagination: IPage.IPagination;

    /**
     * Array of status history records representing order state transitions.
     *
     * Contains chronologically ordered status change events for the current
     * page, with each element capturing one transition in the order
     * lifecycle. Includes status type, transition timestamp, and optional
     * notes for displaying complete audit trails in timeline interfaces and
     * compliance reports.
     */
    data: IShoppingMallOrderStatusHistory.ISummary[];
  };
}
