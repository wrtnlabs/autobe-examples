import { IPage } from "./IPage";
import { IShoppingMallDispute } from "./IShoppingMallDispute";

export namespace IPageIShoppingMallDispute {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallDispute.ISummary[];
  };
}
