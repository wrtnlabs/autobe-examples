import { IPage } from "./IPage";
import { IShoppingMallProductAttribute } from "./IShoppingMallProductAttribute";

export namespace IPageIShoppingMallProductAttribute {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductAttribute.ISummary[];
  };
}
