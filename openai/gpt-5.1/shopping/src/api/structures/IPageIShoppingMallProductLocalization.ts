import { IPage } from "./IPage";
import { IShoppingMallProductLocalization } from "./IShoppingMallProductLocalization";

export namespace IPageIShoppingMallProductLocalization {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductLocalization.ISummary[];
  };
}
