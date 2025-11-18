import { IPage } from "./IPage";
import { IShoppingMallProductCategory } from "./IShoppingMallProductCategory";

export namespace IPageIShoppingMallProductCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductCategory.ISummary[];
  };
}
