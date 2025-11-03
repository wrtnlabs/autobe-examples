import { IPage } from "./IPage";
import { IShoppingAdminSuspension } from "./IShoppingAdminSuspension";

export namespace IPageIShoppingAdminSuspension {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingAdminSuspension.ISummary[];
  };
}
