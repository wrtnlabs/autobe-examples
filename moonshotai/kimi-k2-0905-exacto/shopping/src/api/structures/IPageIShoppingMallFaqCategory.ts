import { IPage } from "./IPage";
import { IShoppingMallFaqCategory } from "./IShoppingMallFaqCategory";

export namespace IPageIShoppingMallFaqCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallFaqCategory.ISummary[];
  };
}
