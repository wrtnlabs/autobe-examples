import { IPage } from "./IPage";
import { IShoppingMallRole } from "./IShoppingMallRole";

export namespace IPageIShoppingMallRole {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallRole.ISummary[];
  };
}
