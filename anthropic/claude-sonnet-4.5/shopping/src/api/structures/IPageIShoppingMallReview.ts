import { IPage } from "./IPage";
import { IShoppingMallReview } from "./IShoppingMallReview";

export namespace IPageIShoppingMallReview {
  /**
   * Paginated response wrapper for product review lists in the shopping mall
   * marketplace.
   *
   * This DTO represents a standard paginated collection structure containing
   * product review records along with pagination metadata. Used as the
   * response type for review search and listing operations that return
   * multiple reviews matching filter criteria such as product filters, rating
   * ranges, verification status, or text search queries.
   *
   * The structure follows the IPage pattern used consistently across all
   * paginated endpoints in the system, combining the pagination navigation
   * object with the data payload array. This enables clients to implement
   * pagination controls and navigate through large review collections
   * efficiently, which is essential for products with hundreds or thousands
   * of customer reviews.
   *
   * Typically returned by product detail page review sections, buyer review
   * history pages, seller review monitoring dashboards, and administrative
   * moderation interfaces where reviews are queried with filtering, sorting,
   * and pagination parameters. The pagination object provides current page
   * number, page size limits, total record counts, and total page counts for
   * building pagination UI components. The data array contains review summary
   * records optimized for list display, including star ratings, review
   * snippets, buyer information, verification badges, and helpfulness metrics
   * that enable quick scanning of customer feedback without loading complete
   * review details.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReview.ISummary[];
  };
}
