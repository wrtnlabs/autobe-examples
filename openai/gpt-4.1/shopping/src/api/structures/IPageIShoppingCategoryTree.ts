import { IPage } from "./IPage";
import { IShoppingCategoryTree } from "./IShoppingCategoryTree";

export namespace IPageIShoppingCategoryTree {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingCategoryTree.ISummary[];
  };
}
