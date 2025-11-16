import { IPage } from "./IPage";
import { IShoppingMallGuestCartItem } from "./IShoppingMallGuestCartItem";

export namespace IPageIShoppingMallGuestCartItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallGuestCartItem.ISummary[];
  };
}
