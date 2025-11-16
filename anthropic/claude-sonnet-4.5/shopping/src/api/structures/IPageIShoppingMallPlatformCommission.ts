import { IPage } from "./IPage";
import { IShoppingMallPlatformCommission } from "./IShoppingMallPlatformCommission";

export namespace IPageIShoppingMallPlatformCommission {
  /**
   * Paginated response wrapper for platform commission record lists in the
   * shopping mall marketplace.
   *
   * This DTO represents a standard paginated collection structure containing
   * platform commission records along with pagination metadata. Used as the
   * response type for commission search and listing operations that return
   * multiple commission records matching filter criteria.
   *
   * The structure follows the IPage pattern used consistently across all
   * paginated endpoints in the system, combining the pagination navigation
   * object with the data payload array. This enables clients to implement
   * pagination controls and navigate through large commission record sets
   * efficiently.
   *
   * Typically returned by administrative financial reporting endpoints and
   * seller commission tracking interfaces where commission records are
   * queried with filtering, sorting, and pagination parameters. The
   * pagination object provides current page number, page size limits, total
   * record counts, and total page counts for building pagination UI
   * components. The data array contains commission summary records optimized
   * for list display in financial dashboards and accounting reconciliation
   * views.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPlatformCommission.ISummary[];
  };
}
