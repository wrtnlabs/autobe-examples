import { IPage } from "./IPage";
import { IShoppingMallAdminActivity } from "./IShoppingMallAdminActivity";

export namespace IPageIShoppingMallAdminActivity {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAdminActivity.ISummary[];
  };
}
