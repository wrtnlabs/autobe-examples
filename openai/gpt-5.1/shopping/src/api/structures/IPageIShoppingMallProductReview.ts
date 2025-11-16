import { IPage } from "./IPage";
import { IShoppingMallProductReview } from "./IShoppingMallProductReview";

export namespace IPageIShoppingMallProductReview {
  /**
   * Paginated collection of product review summary records for storefront and
   * administrative review search operations.
   *
   * This schema is used as the response wrapper for endpoints such as `PATCH
   * /shoppingMall/reviews`, `PATCH
   * /shoppingMall/platformAdmin/products/{productId}/reviews`, and `PATCH
   * /shoppingMall/products/{productId}/skus/{skuId}/reviews`, which query
   * `shopping_mall_product_reviews` with rich filtering and sorting options.
   *
   * The `pagination` property provides page‑level metadata needed to navigate
   * through large review sets, while the `data` array contains
   * `IShoppingMallProductReview.ISummary` items optimized for list displays
   * in product detail pages, moderation consoles, and analytics views. The
   * page itself is read‑only and reflects a snapshot of the review search
   * results at the time of the request.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current product review search results.
     *
     * This object uses the shared `IPage.IPagination` contract to describe
     * which slice of the full `shopping_mall_product_reviews` result set is
     * being returned, including the current page number, page size, total
     * matching reviews, and total page count.
     *
     * Clients combine this information with the filters in
     * `IShoppingMallProductReview.IRequest` (such as rating range, presence
     * of media, and moderation status) to build pageable review lists in
     * storefronts and administrative dashboards.
     */
    pagination: IPage.IPagination;

    /**
     * Current page of product review summaries.
     *
     * Each element is an `IShoppingMallProductReview.ISummary` record
     * representing a single customer-authored product review in lightweight
     * form, including rating, truncated content, author display name, media
     * flags, and visibility status.
     *
     * The collection corresponds to the subset of reviews that match the
     * search criteria in the associated
     * `IShoppingMallProductReview.IRequest` and is ordered according to the
     * requested sort options (for example, most recent, highest rating, or
     * most helpful) so that UIs can render predictable, paginated review
     * lists.
     */
    data: IShoppingMallProductReview.ISummary[];
  };
}
