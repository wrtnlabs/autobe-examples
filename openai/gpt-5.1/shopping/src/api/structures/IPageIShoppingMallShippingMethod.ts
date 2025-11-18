import { IPage } from "./IPage";
import { IShoppingMallShippingMethod } from "./IShoppingMallShippingMethod";

export namespace IPageIShoppingMallShippingMethod {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallShippingMethod.ISummary[];
  };
}
