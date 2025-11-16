import { IPage } from "./IPage";
import { IShoppingMallWishlistItem } from "./IShoppingMallWishlistItem";

export namespace IPageIShoppingMallWishlistItem {
  /**
   * Paginated response for wishlist item search operations within a given
   * customer wishlist.
   *
   * Follows the IPage<T> DTO pattern: `pagination` delivers precise
   * navigation and result count feedback, while `data` provides an ordered
   * array of wishlist item summaries, each reference-resolvable back to
   * individual shopping_mall_wishlist_items. Entries in `data` give concise
   * context for each saved SKU in the wishlist and are ideal for efficient
   * list displays, cart migration actions, or user-facing summary tables.
   *
   * Business context: Used in list/search endpoints for wishlist contents,
   * supporting scalable UI and backend flows, and harmonized
   * usability/consistency in all wishlist consumption scenarios by platform
   * customers, support staff, or analytics/reporting features.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallWishlistItem.ISummary[];
  };
}
