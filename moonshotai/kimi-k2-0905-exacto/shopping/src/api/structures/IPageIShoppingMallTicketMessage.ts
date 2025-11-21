import { IPage } from "./IPage";
import { IShoppingMallTicketMessage } from "./IShoppingMallTicketMessage";

export namespace IPageIShoppingMallTicketMessage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallTicketMessage.ISummary[];
  };
}
