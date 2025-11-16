import { IPage } from "./IPage";
import { IShoppingMallCategory } from "./IShoppingMallCategory";

export namespace IPageIShoppingMallCategory {
  /**
   * Paginated response wrapper for product category listings in the shopping
   * mall marketplace.
   *
   * This type encapsulates a single page of category results along with
   * pagination metadata, enabling efficient retrieval and navigation of
   * potentially large category hierarchies. Used as the response type for
   * category search, filter, and browsing operations.
   *
   * The pagination structure allows clients to retrieve category data in
   * manageable chunks rather than loading entire category trees at once,
   * improving performance and user experience. Clients can navigate through
   * pages using the pagination metadata to request previous, next, first, or
   * last pages.
   *
   * Typically used in category list endpoints, hierarchical navigation
   * operations, and administrative category management interfaces. The
   * response combines the requested category data with navigation information
   * needed to build pagination controls in user interfaces.
   *
   * This wrapper type follows standard pagination patterns across the
   * shopping mall API, providing consistent response structures for all
   * paginated list operations. The pagination field contains standardized
   * metadata while the data field holds the domain-specific category
   * records.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the category listing response.
     *
     * Provides essential information about the current page position, total
     * records available, and navigation details. Includes current page
     * number, records per page limit, total record count in the database,
     * and total pages available.
     *
     * Clients use this information to render pagination controls, determine
     * if additional pages exist, and construct requests for subsequent or
     * previous pages in the category browsing experience.
     */
    pagination: IPage.IPagination;

    /**
     * Array of category summary records for the current page.
     *
     * Contains the actual category data matching the search and filter
     * criteria, limited to the page size specified in the request. Each
     * element provides essential category information including unique
     * identifier, name, and code.
     *
     * The array length will be at most equal to the limit parameter, and
     * may be less on the final page or when fewer results match the filter
     * criteria.
     */
    data: IShoppingMallCategory.ISummary[];
  };
}
