import { IDiscussionBoardArticleViewStatEvent } from "./IDiscussionBoardArticleViewStatEvent";
import { IPageIDiscussionBoardSection } from "./IPageIDiscussionBoardSection";

export namespace IPageIDiscussionBoardArticleViewStatEvent {
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
    pagination: IPageIDiscussionBoardSection.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IDiscussionBoardArticleViewStat.ISummary.
     */
    data: IDiscussionBoardArticleViewStatEvent.ISummary[];
  };
}
