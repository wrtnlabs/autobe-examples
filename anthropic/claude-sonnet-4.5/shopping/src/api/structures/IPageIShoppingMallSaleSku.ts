import { IPage } from "./IPage";
import { IShoppingMallSaleSku } from "./IShoppingMallSaleSku";

export namespace IPageIShoppingMallSaleSku {
  /**
   * Paginated response container for product SKU variant search and listing
   * operations.
   *
   * This response structure wraps a collection of SKU variant summaries with
   * pagination metadata, enabling efficient browsing of product variants
   * across multiple pages. Essential for managing products with numerous
   * variant combinations (e.g., products with multiple colors, sizes, and
   * material options).
   *
   * Used as the response type for SKU search and filtering operations where
   * the total number of variants may exceed practical single-response limits.
   * The pagination wrapper allows clients to retrieve results incrementally,
   * improving performance and user experience when dealing with large variant
   * catalogs.
   *
   * The structure separates pagination control information from the actual
   * data payload, following standard REST API pagination patterns. Clients
   * use the pagination metadata to build navigation controls (previous/next
   * page, page numbers, total count displays) while the data array contains
   * the SKU summaries for the current page.
   *
   * Typically returned by operations like PATCH /sales/{saleCode}/skus which
   * retrieve filtered lists of product variants based on search criteria
   * including variant attributes, price ranges, stock levels, and
   * availability status.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the SKU variant result set.
     *
     * Provides essential information about the current page position, total
     * record count, and available pages for navigation. Enables clients to
     * implement pagination controls and calculate total result set size
     * without loading all records.
     *
     * Includes current page number, records per page limit, total record
     * count across all pages, and calculated total page count.
     */
    pagination: IPage.IPagination;

    /**
     * Array of SKU variant summary records for the current page.
     *
     * Contains the actual SKU variant data matching the search criteria and
     * pagination parameters. Each element provides essential variant
     * information including SKU code, pricing, variant attribute
     * combination, and parent product reference.
     *
     * The array length is controlled by the pagination limit parameter and
     * may be smaller than the limit on the final page of results.
     */
    data: IShoppingMallSaleSku.ISummary[];
  };
}
