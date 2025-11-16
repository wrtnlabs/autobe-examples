import { IPage } from "./IPage";
import { IShoppingMallSkuOption } from "./IShoppingMallSkuOption";

export namespace IPageIShoppingMallSkuOption {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSkuOption.ISummary[];
  };
}
