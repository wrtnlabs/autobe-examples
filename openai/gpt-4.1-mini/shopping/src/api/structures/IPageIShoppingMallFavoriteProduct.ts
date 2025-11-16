import { IPage } from "./IPage";
import { IShoppingMallFavoriteProduct } from "./IShoppingMallFavoriteProduct";

export namespace IPageIShoppingMallFavoriteProduct {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallFavoriteProduct.ISummary[];
  };
}
