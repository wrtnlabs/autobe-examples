import { IEconomicBoardArticleAttachment } from "./IEconomicBoardArticleAttachment";
import { IPage } from "./IPage";

export namespace IPageIEconomicBoardArticleAttachment {
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
     * @x-autobe-specification List of records of type IEconomicBoardArticleAttachment.ISummary.
     */
    data: IEconomicBoardArticleAttachment.ISummary[];
  };

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
     * @x-autobe-specification List of records of type IEconomicBoardArticleAttachment.ISum.
     */
    data: IEconomicBoardArticleAttachment.ISum[];
  };
}
