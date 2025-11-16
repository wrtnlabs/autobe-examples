import { IPage } from "./IPage";
import { IShoppingMallReturnRequest } from "./IShoppingMallReturnRequest";

export namespace IPageIShoppingMallReturnRequest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReturnRequest.ISummary[];
  };
}
