import { IPage } from "./IPage";
import { IShoppingMallVariantInventories } from "./IShoppingMallVariantInventories";

export namespace IPageIShoppingMallVariantInventories {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallVariantInventories.ISummary[];
  };
}
