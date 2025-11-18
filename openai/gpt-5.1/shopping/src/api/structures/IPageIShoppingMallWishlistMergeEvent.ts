import { IPage } from "./IPage";
import { IShoppingMallWishlistMergeEvent } from "./IShoppingMallWishlistMergeEvent";

export namespace IPageIShoppingMallWishlistMergeEvent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallWishlistMergeEvent.ISummary[];
  };
}
