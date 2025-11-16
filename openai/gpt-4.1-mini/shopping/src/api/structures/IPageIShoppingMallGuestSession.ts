import { IPage } from "./IPage";
import { IShoppingMallGuestSession } from "./IShoppingMallGuestSession";

export namespace IPageIShoppingMallGuestSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallGuestSession.ISummary[];
  };
}
