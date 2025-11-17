import { IPage } from "./IPage";
import { IShoppingMallAdminSession } from "./IShoppingMallAdminSession";

export namespace IPageIShoppingMallAdminSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAdminSession.ISummary[];
  };
}
