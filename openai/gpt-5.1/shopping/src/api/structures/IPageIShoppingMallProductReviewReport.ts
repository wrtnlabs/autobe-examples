import { IPage } from "./IPage";
import { IShoppingMallProductReviewReport } from "./IShoppingMallProductReviewReport";

export namespace IPageIShoppingMallProductReviewReport {
  /**
   * Paginated collection of product review report summaries for a specific
   * product review.
   *
   * This schema wraps `IShoppingMallProductReviewReport.ISummary` records in
   * a standard page container, combining the `pagination` metadata from
   * `IPage.IPagination` with the `data` array of summary rows. It is the
   * response body type for the operation `PATCH
   * /shoppingMall/platformAdmin/reviews/{reviewId}/reports`, which allows
   * platform administrators to search, filter, and paginate through reports
   * attached to a single product review.
   *
   * The container itself does not introduce additional business fields beyond
   * pagination; all domain-specific details about individual reports—such as
   * reason codes, statuses, and timestamps—are provided by the summary DTOs
   * contained in the `data` array, which map directly to the
   * `shopping_mall_product_review_reports` Prisma model.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of product review reports.
     *
     * This object follows the shared `IPage.IPagination` contract and
     * exposes the current page index, the maximum number of items per page,
     * the total number of matching report records, and the total number of
     * pages. Admin and moderation UIs use this information to render
     * paginated navigation (for example, previous/next buttons) when
     * browsing large volumes of review reports for a single product
     * review.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of product review report summaries returned for the
     * current page.
     *
     * Each element is an `IShoppingMallProductReviewReport.ISummary` DTO,
     * representing a lightweight view of a single row from the
     * `shopping_mall_product_review_reports` table. These summaries are
     * typically filtered by a specific `reviewId` and additional search
     * criteria such as status, severity, or reporter type, and are used by
     * platform administrators to inspect abuse flags and policy violation
     * reports in list views.
     */
    data: IShoppingMallProductReviewReport.ISummary[];
  };
}
