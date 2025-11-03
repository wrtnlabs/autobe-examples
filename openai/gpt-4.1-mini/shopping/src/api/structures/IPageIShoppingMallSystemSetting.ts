import { IPage } from "./IPage";
import { IShoppingMallSystemSetting } from "./IShoppingMallSystemSetting";

export namespace IPageIShoppingMallSystemSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSystemSetting.ISummary[];
  };
}
