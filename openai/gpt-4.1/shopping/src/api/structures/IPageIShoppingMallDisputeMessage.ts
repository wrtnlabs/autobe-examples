import { IPage } from "./IPage";
import { IShoppingMallDisputeMessage } from "./IShoppingMallDisputeMessage";

export namespace IPageIShoppingMallDisputeMessage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallDisputeMessage.ISummary[];
  };
}
