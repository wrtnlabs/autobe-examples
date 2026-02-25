import { IEconomicPoliticalDiscussionBoardTag } from "./IEconomicPoliticalDiscussionBoardTag";
import { IPage } from "./IPage";

export namespace IPageIEconomicPoliticalDiscussionBoardTag {
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
     * @x-autobe-specification List of records of type IEconomicPoliticalDiscussionBoardTag.ISummary.
     */
    data: IEconomicPoliticalDiscussionBoardTag.ISummary[];
  };
}
