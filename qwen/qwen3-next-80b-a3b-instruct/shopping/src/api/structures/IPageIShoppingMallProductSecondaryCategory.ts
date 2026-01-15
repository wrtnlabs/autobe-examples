import { IPage } from "./IPage";
import { IShoppingMallProductSecondaryCategory } from "./IShoppingMallProductSecondaryCategory";

export namespace IPageIShoppingMallProductSecondaryCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductSecondaryCategory.ISummary[];
  };
}
