import { IPage } from "./IPage";
import { IShoppingMallProductSearchIndex } from "./IShoppingMallProductSearchIndex";

export namespace IPageIShoppingMallProductSearchIndex {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductSearchIndex.ISummary[];
  };
}
