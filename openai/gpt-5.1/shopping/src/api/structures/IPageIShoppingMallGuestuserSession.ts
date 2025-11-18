import { IPage } from "./IPage";
import { IShoppingMallGuestuserSession } from "./IShoppingMallGuestuserSession";

export namespace IPageIShoppingMallGuestuserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallGuestuserSession.ISummary[];
  };
}
