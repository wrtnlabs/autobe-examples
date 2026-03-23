import { IPage } from "./IPage";
import { IShoppingMallCartSnapshot } from "./IShoppingMallCartSnapshot";

export namespace IPageIShoppingMallCartSnapshot {
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
     * @x-autobe-specification List of records of type IShoppingMallCartSnapshot.ISummary.
     */
    data: IShoppingMallCartSnapshot.ISummary[];
  };
}
