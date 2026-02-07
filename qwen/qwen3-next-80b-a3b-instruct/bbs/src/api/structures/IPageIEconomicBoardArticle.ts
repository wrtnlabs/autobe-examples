import { IEconomicBoardArticle } from "./IEconomicBoardArticle";
import { IPage } from "./IPage";

export namespace IPageIEconomicBoardArticle {
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
     * @x-autobe-specification List of records of type IEconomicBoardArticle.ISum.
     */
    data: IEconomicBoardArticle.ISum[];
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
     * @x-autobe-specification List of records of type IEconomicBoardArticle.ISummary.
     */
    data: IEconomicBoardArticle.ISummary[];
  };
}
