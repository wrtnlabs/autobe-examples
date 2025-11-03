import { IPage } from "./IPage";
import { IShoppingBusinessSetting } from "./IShoppingBusinessSetting";

export namespace IPageIShoppingBusinessSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingBusinessSetting.ISummary[];
  };
}
