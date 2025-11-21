import { IPage } from "./IPage";
import { IShoppingMallProductUnit } from "./IShoppingMallProductUnit";

export namespace IPageIShoppingMallProductUnit {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductUnit.ISummary[];
  };
}
