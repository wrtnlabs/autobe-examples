import { IPage } from "./IPage";
import { IShoppingMallOrderSearch } from "./IShoppingMallOrderSearch";

export namespace IPageIShoppingMallOrderSearch {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderSearch.ISummary[];
  };
}
