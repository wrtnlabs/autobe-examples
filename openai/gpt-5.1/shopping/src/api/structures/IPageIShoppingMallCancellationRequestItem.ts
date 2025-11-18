import { IPage } from "./IPage";
import { IShoppingMallCancellationRequestItem } from "./IShoppingMallCancellationRequestItem";

export namespace IPageIShoppingMallCancellationRequestItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCancellationRequestItem.ISummary[];
  };
}
