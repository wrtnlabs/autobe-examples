import { IPage } from "./IPage";
import { IShoppingMallUserRole } from "./IShoppingMallUserRole";

export namespace IPageIShoppingMallUserRole {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallUserRole.ISummary[];
  };
}
