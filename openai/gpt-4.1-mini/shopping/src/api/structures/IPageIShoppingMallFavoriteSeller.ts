import { IPage } from "./IPage";
import { IShoppingMallFavoriteSeller } from "./IShoppingMallFavoriteSeller";

export namespace IPageIShoppingMallFavoriteSeller {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallFavoriteSeller.ISummary[];
  };
}
