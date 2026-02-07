import { IEconomicBoardBan } from "./IEconomicBoardBan";
import { IPage } from "./IPage";

export namespace IPageIEconomicBoardBan {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISum = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IEconomicBoardBan.ISum.
     */
    data: IEconomicBoardBan.ISum[];
  };

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
     * @x-autobe-specification List of records of type IEconomicBoardBan.ISummary.
     */
    data: IEconomicBoardBan.ISummary[];
  };
}
