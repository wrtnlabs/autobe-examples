import { IPage } from "./IPage";
import { IShoppingMallCancellationRequest } from "./IShoppingMallCancellationRequest";

export namespace IPageIShoppingMallCancellationRequest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCancellationRequest.ISummary[];
  };
}
