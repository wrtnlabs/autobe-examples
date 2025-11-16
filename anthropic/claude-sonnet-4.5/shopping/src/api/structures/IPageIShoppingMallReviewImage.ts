import { IPage } from "./IPage";
import { IShoppingMallReviewImage } from "./IShoppingMallReviewImage";

export namespace IPageIShoppingMallReviewImage {
  /**
   * Paginated collection of product review images for a specific review.
   *
   * This response structure contains a filtered and sorted list of images
   * uploaded by verified buyers as visual evidence in their product reviews.
   * Each page includes both the image data records and pagination metadata
   * for navigating the full result set.
   *
   * Review images provide crucial visual context that helps other buyers
   * assess product quality, appearance, and condition beyond what
   * seller-provided marketing images show. Pagination enables efficient
   * loading of large image sets while maintaining responsive performance in
   * review browsing experiences.
   *
   * Used in review detail pages, image galleries, and administrative
   * moderation interfaces where buyers and moderators need to view and
   * navigate through review images. The pagination structure allows clients
   * to implement infinite scroll, page-based navigation, or thumbnail grids
   * with lazy loading.
   *
   * The data array contains summary representations optimized for display,
   * including image URLs in multiple sizes (original, medium, thumbnail) for
   * responsive rendering across devices and contexts.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating through the review image
     * collection.
     *
     * Provides information about the current page, total pages, total image
     * records, and page size limits. Enables efficient browsing of large
     * image sets by breaking them into manageable pages.
     *
     * Essential for implementing image gallery navigation controls and
     * determining whether additional images are available.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of review image summaries in the current page.
     *
     * Contains the actual review image records matching the search
     * criteria, ordered according to the specified sort parameters. Each
     * item provides essential image information including URLs, display
     * order, and identifiers for rendering in image galleries.
     */
    data: IShoppingMallReviewImage.ISummary[];
  };
}
