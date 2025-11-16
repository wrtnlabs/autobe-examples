import { IPage } from "./IPage";
import { IShoppingMallSellerVerification } from "./IShoppingMallSellerVerification";

export namespace IPageIShoppingMallSellerVerification {
  /**
   * Paginated collection of seller verification records as returned from
   * search/list API operations.
   *
   * This schema represents a single page of seller verification results, used
   * throughout the platform in KYC audit dashboards, compliance workflows,
   * and traceability screens. It consolidates summary information for
   * multiple verifications, supports navigation across large data sets via
   * the pagination metadata, and ensures robust auditability and workflow
   * integration for regulated onboarding and compliance processes.
   *
   * Typical use includes rendering verification history tables for sellers
   * and admins, supporting filtering and searching across time/range/status,
   * and providing business process evidence in regulatory reviews.
   */
  export type ISummary = {
    /**
     * Page information for the result set.
     *
     * This property contains all relevant information about the current
     * pagination state, including current page index, record count, and
     * total pages. It is required for supporting navigation across large
     * sets of seller verification records in the dashboard, audit, and KYC
     * compliance review UIs.
     *
     * Pagination metadata enables user interfaces, reports, and audit
     * screens to properly render navigation links, display totals, and
     * ensure traceability in regulated business verification workflows.
     * This is essential for enterprise workflows tracking KYC compliance
     * history and seller onboarding regulatory audit trails.
     */
    pagination: IPage.IPagination;

    /**
     * List of seller verification summary records for the requested page.
     *
     * This array contains all IShoppingMallSellerVerification.ISummary
     * objects for the current page of the search result, as defined by the
     * pagination settings above. Each entry represents a KYC/business
     * verification event or state transition for a specific seller.
     *
     * This structure enables dashboard, audit, or workflow UIs to
     * efficiently render compliance history, show progress through required
     * business verification steps, and present traceability for each
     * seller's onboarding process over time.
     */
    data: IShoppingMallSellerVerification.ISummary[];
  };
}
