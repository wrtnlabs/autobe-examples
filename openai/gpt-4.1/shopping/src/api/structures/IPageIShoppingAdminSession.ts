import { IPage } from "./IPage";
import { IShoppingAdminSession } from "./IShoppingAdminSession";

export namespace IPageIShoppingAdminSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingAdminSession.ISummary[];
  };
}
