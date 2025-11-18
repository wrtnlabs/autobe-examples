import { IPage } from "./IPage";
import { IShoppingMallGuestUser } from "./IShoppingMallGuestUser";

export namespace IPageIShoppingMallGuestuser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallGuestUser.ISummary[];
  };
}
