import { IPage } from "./IPage";
import { IShoppingProduct } from "./IShoppingProduct";

export namespace IPageIShoppingProduct {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingProduct.ISummary[];
  };
}
