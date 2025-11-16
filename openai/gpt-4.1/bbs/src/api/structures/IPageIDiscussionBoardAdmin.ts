import { IPage } from "./IPage";
import { IDiscussionBoardAdmin } from "./IDiscussionBoardAdmin";

export namespace IPageIDiscussionBoardAdmin {
  /**
   * Paginated result set for administrator account summary listings.
   *
   * This schema represents a paginated collection of administrator summary
   * objects, each summarizing a platform admin account for moderation, audit,
   * or management review. Used by endpoints that search, filter, or paginate
   * admin records—particularly in admin dashboards, audit oversight systems,
   * and privilege management flows.
   *
   * Includes both pagination metadata and a data array containing summaries
   * of individual admin accounts. Supports scalability by allowing efficient
   * traversal of large administrator datasets for compliance reviews, access
   * audits, and platform operations. Ensures traceability and consistency
   * with audit and rate-limited admin search endpoints on the platform.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardAdmin.ISummary[];
  };
}
