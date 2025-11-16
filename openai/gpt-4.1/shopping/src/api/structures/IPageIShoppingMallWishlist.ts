import { IPage } from "./IPage";
import { IShoppingMallWishlist } from "./IShoppingMallWishlist";

export namespace IPageIShoppingMallWishlist {
  /**
   * Paginated response structure for shopping mall wishlist search results.
   *
   * This schema collects a set of customer wishlist summaries together with
   * paging metadata, matching the IPage<T> meta-pattern used across the
   * platform for search endpoints. The `pagination` property provides full
   * context for page navigation (current page, limit, record counts), while
   * the `data` array contains summary views of individual wishlists. Each
   * entry in `data` is a condensed snapshot of a single persisted customer
   * wishlist; these are suitable for list rendering and can be referenced by
   * ID for detailed fetching.
   *
   * This structure supports scalable administrative queries and batched
   * rendering in dashboards, analytics, or management tools, especially when
   * reviewing customer interest and engagement patterns across the catalog.
   * The type is optimized for REST API response efficiency and reusability in
   * all interfaces exposing paged search results for the
   * shopping_mall_wishlists table, including role-based and reporting
   * contexts.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallWishlist.ISummary[];
  };
}
