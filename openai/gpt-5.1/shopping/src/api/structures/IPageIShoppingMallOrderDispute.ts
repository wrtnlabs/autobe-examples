import { IPage } from "./IPage";
import { IShoppingMallOrderDispute } from "./IShoppingMallOrderDispute";

export namespace IPageIShoppingMallOrderDispute {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderDispute.ISummary[];
  };
}
