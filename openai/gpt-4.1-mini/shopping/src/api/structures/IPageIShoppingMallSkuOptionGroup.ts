import { IPage } from "./IPage";
import { IShoppingMallSkuOptionGroup } from "./IShoppingMallSkuOptionGroup";

export namespace IPageIShoppingMallSkuOptionGroup {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSkuOptionGroup.ISummary[];
  };
}
