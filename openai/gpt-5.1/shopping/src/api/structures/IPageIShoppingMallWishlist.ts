import { IPage } from "./IPage";
import { IShoppingMallWishlist } from "./IShoppingMallWishlist";

export namespace IPageIShoppingMallWishlist {
  /**
   * Paginated collection of customer wishlist summaries returned from the
   * `shopping_mall_wishlists` table.
   *
   * This schema is used as the response wrapper for wishlist search
   * operations such as `PATCH /shoppingMall/customer/wishlists`, where the
   * request body is an `IShoppingMallWishlist.IRequest` containing
   * pagination, search, and filter criteria. It encapsulates both the
   * page-level metadata and the list of `IShoppingMallWishlist.ISummary`
   * records that match the requested criteria for the authenticated
   * customer.
   *
   * The `pagination` property describes how the current page fits into the
   * overall result set, including the total number of wishlists found. The
   * `data` array carries the wishlist summaries themselves, which are
   * optimized for list and dashboard views rather than full detail display.
   *
   * Like other `IPage*` response types in the ShoppingMall API, this schema
   * is read-only and is not used as an input for creation or update
   * operations. It exists to provide a consistent, well-documented envelope
   * around paginated wishlist data drawn from `shopping_mall_wishlists` and
   * scoped to the current customer actor.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of wishlist summaries.
     *
     * This object conforms to the shared `IPage.IPagination` contract and
     * indicates the current page number, page size, total number of
     * wishlists that match the search criteria, and the total number of
     * result pages. It reflects the filters, search terms, and sort order
     * supplied via `IShoppingMallWishlist.IRequest`.
     *
     * Front-end consumers use this information to build paginated list
     * experiences for customer wishlists, including page navigation widgets
     * and summary counts in account dashboards.
     */
    pagination: IPage.IPagination;

    /**
     * Array of wishlist summary records for the current page of results.
     *
     * Each element is an `IShoppingMallWishlist.ISummary` DTO representing
     * a single wishlist row sourced from the `shopping_mall_wishlists`
     * Prisma model and enriched with a lightweight view of the owning
     * customer. These summaries include identifiers, names, item counts,
     * default/archived flags, and key timestamps suitable for list views.
     *
     * The array may be empty when the authenticated customer has no
     * wishlists or when the applied filters (such as search text,
     * created-at range, or archived status) yield no matches. An empty
     * array is a valid state and signals “no wishlists in this page” rather
     * than an error.
     */
    data: IShoppingMallWishlist.ISummary[];
  };
}
