import { IPage } from "./IPage";
import { IShoppingMallWishlistItem } from "./IShoppingMallWishlistItem";

export namespace IPageIShoppingMallWishlistItem {
  /**
   * Paginated response wrapper for wishlist item search results.
   *
   * This paginated collection contains wishlist items that authenticated
   * buyers have saved for future purchase consideration. The response
   * structure includes both the wishlist item data array and pagination
   * metadata for navigating through the buyer's complete wishlist when it
   * contains more items than the requested page size.
   *
   * The pagination field provides essential navigation information including
   * the current page number, items per page limit, total record count across
   * all pages, and total page count. This metadata enables frontend
   * applications to render pagination controls, display result counts, and
   * calculate result ranges.
   *
   * The data array contains IShoppingMallWishlistItem.ISummary objects
   * optimized for list display, showing essential product details, pricing
   * information, availability status, and when items were added to the
   * wishlist. Each summary includes embedded product SKU and sale information
   * through nested references, providing sufficient context for buyers to
   * evaluate their saved items without additional API calls.
   *
   * This response type is used by the wishlist search operation to return
   * filtered and sorted wishlist results based on buyer-specified criteria
   * such as product name, category, price range, or date added. The paginated
   * structure ensures performant responses even for buyers with extensive
   * wishlists approaching the 200-item maximum limit.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallWishlistItem.ISummary[];
  };
}
