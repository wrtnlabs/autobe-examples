import { IPage } from "./IPage";
import { IShoppingMallSupportTicket } from "./IShoppingMallSupportTicket";

export namespace IPageIShoppingMallSupportTicket {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSupportTicket.ISummary[];
  };
}
