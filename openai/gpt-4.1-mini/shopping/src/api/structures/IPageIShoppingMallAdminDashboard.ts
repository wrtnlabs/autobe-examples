import { IPage } from "./IPage";
import { IShoppingMallAdminDashboard } from "./IShoppingMallAdminDashboard";

export namespace IPageIShoppingMallAdminDashboard {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAdminDashboard.ISummary[];
  };
}
