import { IPage } from "./IPage";
import { IShoppingMallSkuAttribute } from "./IShoppingMallSkuAttribute";

export namespace IPageIShoppingMallSkuAttribute {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSkuAttribute.ISummary[];
  };
}
