import { IPage } from "./IPage";
import { IShoppingMallAdminNotification } from "./IShoppingMallAdminNotification";

export namespace IPageIShoppingMallAdminNotification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAdminNotification.ISummary[];
  };
}
