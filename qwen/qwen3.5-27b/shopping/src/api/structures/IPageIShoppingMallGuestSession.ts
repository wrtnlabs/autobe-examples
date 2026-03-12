import { IPage } from "./IPage";
import { IShoppingMallGuestSession } from "./IShoppingMallGuestSession";

export namespace IPageIShoppingMallGuestSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IShoppingMallGuestSession.ISummary.
     */
    data: IShoppingMallGuestSession.ISummary[];
  };
}
