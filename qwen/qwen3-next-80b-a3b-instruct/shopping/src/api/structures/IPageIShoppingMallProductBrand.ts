import { IPage } from "./IPage";
import { IShoppingMallProductBrand } from "./IShoppingMallProductBrand";

export namespace IPageIShoppingMallProductBrand {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductBrand.ISummary[];
  };
}
