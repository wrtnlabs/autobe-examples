import { IPage } from "./IPage";
import { IShoppingMallProductAttributeValue } from "./IShoppingMallProductAttributeValue";

export namespace IPageIShoppingMallProductAttributeValue {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductAttributeValue.ISummary[];
  };
}
