import { IPage } from "./IPage";
import { IShoppingMallAdminRole } from "./IShoppingMallAdminRole";

export namespace IPageIShoppingMallAdminRole {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAdminRole.ISummary[];
  };
}
