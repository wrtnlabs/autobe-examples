import { IPage } from "./IPage";
import { IShoppingMallOrderCancellation } from "./IShoppingMallOrderCancellation";

export namespace IPageIShoppingMallOrderCancellation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderCancellation.ISummary[];
  };
}
