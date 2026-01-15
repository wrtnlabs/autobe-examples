import { IPage } from "./IPage";
import { IShoppingMallProductSpec } from "./IShoppingMallProductSpec";

export namespace IPageIShoppingMallProductSpec {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductSpec.ISummary[];
  };
}
