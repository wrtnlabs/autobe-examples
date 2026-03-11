import { IEcommerceMallInventoryRecord } from "./IEcommerceMallInventoryRecord";
import { IPage } from "./IPage";

export namespace IPageIEcommerceMallInventoryRecord {
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
     * @x-autobe-specification List of records of type IEcommerceMallInventoryRecord.ISummary.
     */
    data: IEcommerceMallInventoryRecord.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IHistoryList = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IEcommerceMallInventoryRecord.IHistoryList.
     */
    data: IEcommerceMallInventoryRecord.IHistoryList[];
  };
}
