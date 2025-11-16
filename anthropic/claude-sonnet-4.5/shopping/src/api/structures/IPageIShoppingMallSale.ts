import { IPage } from "./IPage";
import { IShoppingMallSale } from "./IShoppingMallSale";

export namespace IPageIShoppingMallSale {
  /**
   * Paginated response wrapper for product sale listings in the shopping mall
   * marketplace.
   *
   * This type encapsulates a single page of product sale results along with
   * comprehensive pagination metadata, enabling efficient retrieval and
   * navigation through potentially large product catalogs. Serves as the
   * standard response structure for product search, discovery, and inventory
   * browsing operations.
   *
   * Pagination prevents performance degradation and overwhelming data
   * transfer by breaking large result sets into manageable pages. Buyers can
   * browse products page-by-page, sellers can navigate their inventory in
   * chunks, and admins can review marketplace listings systematically.
   *
   * The response structure combines requested product data with navigation
   * metadata needed to implement pagination controls in user interfaces.
   * Clients can determine total result counts, current position within
   * results, and availability of additional pages without making separate
   * count queries.
   *
   * Used extensively in product discovery endpoints including
   * marketplace-wide searches, category-filtered browsing, seller-specific
   * inventory views, and administrative product moderation interfaces. The
   * pagination wrapper provides consistency across all product listing
   * operations throughout the shopping mall API.
   *
   * The standardized pagination structure enables client applications to
   * implement reusable pagination components that work uniformly across
   * different product listing contexts, improving development efficiency and
   * user experience consistency.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the product sale listing response.
     *
     * Provides essential navigation information including current page
     * number, records per page limit, total record count across all pages,
     * and total number of pages available. Enables clients to build
     * pagination controls and determine navigation possibilities.
     *
     * Clients use this metadata to render page selectors, previous/next
     * buttons, and page jump controls in product listing interfaces.
     */
    pagination: IPage.IPagination;

    /**
     * Array of product sale summary records for the current page.
     *
     * Contains the actual product listings matching the search and filter
     * criteria, limited to the page size specified in the request. Each
     * element provides essential product information including identifier,
     * name, price, thumbnail image, seller reference, and category
     * assignment.
     *
     * The array length will be at most equal to the requested limit
     * parameter, and may be smaller on the final page or when fewer
     * products match the filter criteria.
     */
    data: IShoppingMallSale.ISummary[];
  };
}
