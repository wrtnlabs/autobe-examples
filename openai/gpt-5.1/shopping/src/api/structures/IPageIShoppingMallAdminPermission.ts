import { IPage } from "./IPage";
import { IShoppingMallAdminPermission } from "./IShoppingMallAdminPermission";

export namespace IPageIShoppingMallAdminPermission {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAdminPermission.ISummary[];
  };
}
