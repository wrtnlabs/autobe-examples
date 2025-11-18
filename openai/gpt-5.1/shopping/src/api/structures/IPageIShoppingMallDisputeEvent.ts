import { IPage } from "./IPage";
import { IShoppingMallDisputeEvent } from "./IShoppingMallDisputeEvent";

export namespace IPageIShoppingMallDisputeEvent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallDisputeEvent.ISummary[];
  };
}
