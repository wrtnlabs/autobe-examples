import { IPage } from "./IPage";
import { IShoppingMallWishlistItem } from "./IShoppingMallWishlistItem";

export namespace IPageIShoppingMallWishlistItem {
  /**
   * Paginated collection of wishlist item summaries for a single customer
   * wishlist.
   *
   * This type wraps a `pagination` object and an array of
   * `IShoppingMallWishlistItem.ISummary` records, allowing clients to consume
   * the results of wishlist item listing and search operations in a
   * consistent way. Each entry in `data` corresponds to a row in the
   * `shopping_mall_wishlist_items` Prisma model, projected through the
   * wishlist item summary DTO so that the UI can render identifiers, product
   * or SKU context, and key visual attributes without additional round
   * trips.
   *
   * The container is used as the response body for operations such as `PATCH
   * /shoppingMall/customer/wishlists/{wishlistId}/items`, where the path
   * parameter `wishlistId` identifies the parent wishlist (from
   * `shopping_mall_wishlists`) and the request body carries filtering,
   * sorting, and paging criteria. The `pagination` field reflects the current
   * page, page size, total record count, and total page count, while the
   * `data` array holds only the wishlist items that match the caller’s query.
   * This separation ensures that list screens can easily drive infinite
   * scroll, page navigation, and summary counters using the same envelope
   * structure across the shopping mall APIs.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallWishlistItem.ISummary[];
  };
}
