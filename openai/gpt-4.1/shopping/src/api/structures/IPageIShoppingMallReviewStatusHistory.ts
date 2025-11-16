import { IPage } from "./IPage";
import { IShoppingMallReviewStatusHistory } from "./IShoppingMallReviewStatusHistory";

export namespace IPageIShoppingMallReviewStatusHistory {
  /**
   * Paginated result collection of review/moderation status history snapshots
   * for a single product review in the shopping mall platform.
   *
   * This structure provides a navigable page of immutable audit/history
   * events representing the full chain of status transitions for a review
   * (including moderator actions, withdrawals, flagging, approvals,
   * rejections, and more). The context is tailored to support compliance
   * operations, trust & safety, and business dispute processes while ensuring
   * integrity and traceability for regulatory reporting and investigative
   * accountability. Used as the primary data structure in admin and
   * moderation dashboard features.
   */
  export type ISummary = {
    /**
     * Pagination metadata specifying the current page, page size, total
     * records, and total pages in this audit/history query. Enables the
     * client to navigate through the full snapshot of status/moderation
     * events returned by advanced filtering and search operations.
     *
     * Pagination is essential for reviewing large audit histories with
     * potentially high event volume in compliance and moderation contexts.
     * The structure adheres to the IPage.IPagination schema to ensure
     * standard navigation and consistent user experience in admin and audit
     * dashboards.
     */
    pagination: IPage.IPagination;

    /**
     * The array of review status/moderation history snapshot records being
     * returned on this page. Each entry represents an event in the audit
     * trail for a single product review, reflecting moderation, user
     * withdrawal, status update, or administrative action.
     *
     * This property surfaces the core audit records supporting compliance
     * analysis, moderation review, and business dispute resolution in the
     * shopping mall platform. Used for constructing comprehensive review
     * workflows and supporting litigation readiness.
     */
    data: IShoppingMallReviewStatusHistory.ISummary[];
  };
}
