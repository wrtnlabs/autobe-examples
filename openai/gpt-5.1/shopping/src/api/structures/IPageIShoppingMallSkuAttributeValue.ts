import { IPage } from "./IPage";
import { IShoppingMallSkuAttributeValue } from "./IShoppingMallSkuAttributeValue";

export namespace IPageIShoppingMallSkuAttributeValue {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSkuAttributeValue.ISummary[];
  };
}
