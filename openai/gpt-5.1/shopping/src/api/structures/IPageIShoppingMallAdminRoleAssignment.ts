import { IPage } from "./IPage";
import { IShoppingMallAdminRoleAssignment } from "./IShoppingMallAdminRoleAssignment";

export namespace IPageIShoppingMallAdminRoleAssignment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAdminRoleAssignment.ISummary[];
  };
}
