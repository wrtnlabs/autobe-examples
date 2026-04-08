import { IPage } from "./IPage";
import { IShoppingMallRequestSnapshot } from "./IShoppingMallRequestSnapshot";

export namespace IPageIShoppingMallRequestSnapshot {
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
     * @x-autobe-specification List of records of type IShoppingMallRequestSnapshot.ISummary.
     */
    data: IShoppingMallRequestSnapshot.ISummary[];
  };
}
