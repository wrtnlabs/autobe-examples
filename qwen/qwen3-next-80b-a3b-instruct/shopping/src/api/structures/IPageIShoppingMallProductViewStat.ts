import { IPage } from "./IPage";
import { IShoppingMallProductViewStat } from "./IShoppingMallProductViewStat";

export namespace IPageIShoppingMallProductViewStat {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductViewStat.ISummary[];
  };
}
