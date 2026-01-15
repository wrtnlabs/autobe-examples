import { IPage } from "./IPage";
import { IShoppingMallSearch } from "./IShoppingMallSearch";

export namespace IPageIShoppingMallSearch {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSearch.ISummary[];
  };
}
