import { IPage } from "./IPage";
import { IShoppingMallAdminSession } from "./IShoppingMallAdminSession";

export namespace IPageIShoppingMallAdminSession {
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
     * @x-autobe-specification List of records of type IShoppingMallAdminSession.ISummary.
     */
    data: IShoppingMallAdminSession.ISummary[];
  };
}
