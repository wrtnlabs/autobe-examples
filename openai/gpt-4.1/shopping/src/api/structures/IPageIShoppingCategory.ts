import { IPage } from "./IPage";
import { IShoppingCategory } from "./IShoppingCategory";

export namespace IPageIShoppingCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingCategory.ISummary[];
  };
}
