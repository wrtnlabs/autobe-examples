import { IPage } from "./IPage";
import { IShoppingMallWishlistItem } from "./IShoppingMallWishlistItem";

export namespace IPageIShoppingMallWishlistItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallWishlistItem.ISummary[];
  };
}
