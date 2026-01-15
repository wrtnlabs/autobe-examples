import { IPage } from "./IPage";
import { IShoppingMallDataExports } from "./IShoppingMallDataExports";

export namespace IPageIShoppingMallDataExports {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallDataExports.ISummary[];
  };
}
