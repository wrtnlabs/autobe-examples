import { IPage } from "./IPage";
import { IShoppingMallSystemConfig } from "./IShoppingMallSystemConfig";

export namespace IPageIShoppingMallSystemConfig {
  /**
   * Paginated response wrapper for system configuration summary lists.
   *
   * This structure represents a standard pagination pattern used throughout
   * the API to return large datasets in manageable chunks. It combines
   * pagination metadata with the actual data array, enabling efficient data
   * retrieval and navigation through configuration entries.
   *
   * The pagination wrapper pattern provides several benefits including
   * reduced payload sizes, improved performance for large datasets,
   * predictable response structure, and built-in support for implementing
   * pagination controls in client applications. This consistent pattern is
   * applied across all list operations in the shopping mall platform.
   *
   * Clients receive both the requested data slice and complete information
   * needed to navigate through the full result set, including total record
   * counts and page calculations.
   */
  export type ISummary = {
    /**
     * Pagination metadata providing information about the current page,
     * total records, and navigation context.
     *
     * This object contains essential pagination details including the
     * current page number, records per page limit, total number of records
     * in the database, and total number of pages available. It enables
     * clients to implement pagination controls and understand their
     * position within the complete dataset.
     */
    pagination: IPage.IPagination;

    /**
     * Array of system configuration summary records for the current page.
     *
     * Contains the actual configuration data matching the request criteria,
     * with each element representing a lightweight summary of a
     * configuration entry. The number of elements in this array will not
     * exceed the pagination limit specified in the request.
     */
    data: IShoppingMallSystemConfig.ISummary[];
  };
}
