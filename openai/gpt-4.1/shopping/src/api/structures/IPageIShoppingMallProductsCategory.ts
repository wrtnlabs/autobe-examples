import { IPage } from "./IPage";
import { IShoppingMallProductsCategory } from "./IShoppingMallProductsCategory";

export namespace IPageIShoppingMallProductsCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductsCategory.ISummary[];
  };
}
