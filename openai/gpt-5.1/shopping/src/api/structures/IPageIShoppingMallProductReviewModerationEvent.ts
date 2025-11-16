import { IPage } from "./IPage";
import { IShoppingMallProductReviewModerationEvent } from "./IShoppingMallProductReviewModerationEvent";

export namespace IPageIShoppingMallProductReviewModerationEvent {
  /**
   * Paginated collection of product review moderation event summaries for a
   * specific review.
   *
   * This schema serves as the standard page wrapper for
   * `IShoppingMallProductReviewModerationEvent.ISummary` items, combining the
   * `pagination` metadata defined by `IPage.IPagination` with a `data` array
   * of moderation event summaries. It is used as the response type for the
   * endpoint `PATCH
   * /shoppingMall/platformAdmin/reviews/{reviewId}/moderationEvents`, which
   * allows platform administrators to retrieve a filterable and sortable
   * history of moderation actions applied to a single product review.
   *
   * The wrapper itself is intentionally minimal and focuses on delivering
   * consistent paging semantics across the API. All business-specific details
   * about each moderation event are carried by the `data` elements, which
   * reflect the schema of the underlying
   * `shopping_mall_product_review_moderation_events` Prisma model and provide
   * enough information for audit, compliance, and operational monitoring
   * views.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of moderation events
     * associated with a product review.
     *
     * This object follows the shared `IPage.IPagination` contract and
     * exposes information such as the current page index, page size, total
     * number of matching moderation events, and total page count.
     * Administrative tools use these values to navigate through the full
     * moderation history for a review when many events have been recorded
     * over time.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of moderation event summaries returned for the current
     * page.
     *
     * Each element is an
     * `IShoppingMallProductReviewModerationEvent.ISummary` DTO,
     * representing a lightweight view of a single row from the
     * `shopping_mall_product_review_moderation_events` table. These
     * summaries capture key details such as the moderation action, actor,
     * and timestamp, and are typically scoped by `reviewId` and filtered
     * and sorted according to the request so that administrators can review
     * the moderation timeline in list form.
     */
    data: IShoppingMallProductReviewModerationEvent.ISummary[];
  };
}
