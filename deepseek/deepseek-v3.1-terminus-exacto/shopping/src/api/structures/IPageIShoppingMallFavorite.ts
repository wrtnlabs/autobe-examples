import { IPage } from "./IPage";
import { IShoppingMallFavorite } from "./IShoppingMallFavorite";

export namespace IPageIShoppingMallFavorite {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallFavorite.ISummary[];
  };
}
