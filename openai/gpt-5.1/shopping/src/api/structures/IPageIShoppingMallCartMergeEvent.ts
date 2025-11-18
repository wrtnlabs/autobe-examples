import { IPage } from "./IPage";
import { IShoppingMallCartMergeEvent } from "./IShoppingMallCartMergeEvent";

export namespace IPageIShoppingMallCartMergeEvent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCartMergeEvent.ISummary[];
  };
}
