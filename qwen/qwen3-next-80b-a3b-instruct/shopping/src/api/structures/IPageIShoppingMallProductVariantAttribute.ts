import { IPage } from "./IPage";
import { IShoppingMallProductVariantAttribute } from "./IShoppingMallProductVariantAttribute";

export namespace IPageIShoppingMallProductVariantAttribute {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductVariantAttribute.ISummary[];
  };
}
