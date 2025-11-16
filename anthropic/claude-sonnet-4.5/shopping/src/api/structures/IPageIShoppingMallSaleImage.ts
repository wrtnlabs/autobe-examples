import { IPage } from "./IPage";
import { IShoppingMallSaleImage } from "./IShoppingMallSaleImage";

export namespace IPageIShoppingMallSaleImage {
  /**
   * Paginated response container for product image search and gallery
   * management operations.
   *
   * This response structure wraps a collection of product image summaries
   * with pagination metadata, enabling efficient browsing of product visual
   * content across multiple pages. Essential for managing products with
   * extensive image galleries where loading all images simultaneously would
   * impact performance.
   *
   * Used as the response type for product image listing and search operations
   * where sellers or admins need to browse, organize, or moderate product
   * visual assets. The pagination wrapper allows clients to retrieve images
   * incrementally, which is particularly important for products with many
   * high-resolution images.
   *
   * The structure separates pagination control information from the actual
   * image data payload, following standard REST API pagination patterns.
   * Clients use the pagination metadata to build gallery navigation controls
   * (previous/next page, thumbnail strips, image count displays) while the
   * data array contains the image summaries for the current page.
   *
   * Typically returned by operations like PATCH /sales/{saleCode}/images and
   * PATCH /sales/{saleCode}/skus/{skuCode}/images which retrieve filtered
   * lists of product images based on criteria including display order,
   * primary image status, upload date ranges, and SKU variant associations.
   * Supports efficient image gallery management in both seller dashboards and
   * admin moderation interfaces.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the product image result set.
     *
     * Provides essential information about the current page position, total
     * image count, and available pages for navigation. Enables clients to
     * implement pagination controls and calculate total result set size for
     * product image galleries.
     *
     * Includes current page number, records per page limit, total image
     * count across all pages, and calculated total page count.
     */
    pagination: IPage.IPagination;

    /**
     * Array of product image summary records for the current page.
     *
     * Contains the actual product image data matching the search and filter
     * criteria. Each element provides essential image information including
     * image URL, display order, primary flag, and upload timestamp.
     *
     * The array length is controlled by the pagination limit parameter and
     * may be smaller than the limit on the final page of results.
     */
    data: IShoppingMallSaleImage.ISummary[];
  };
}
