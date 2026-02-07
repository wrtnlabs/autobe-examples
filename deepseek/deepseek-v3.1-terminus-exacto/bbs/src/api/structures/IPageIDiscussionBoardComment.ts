import { IDiscussionBoardComment } from "./IDiscussionBoardComment";
import { IPage } from "./IPage";

export namespace IPageIDiscussionBoardComment {
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
     * @x-autobe-specification List of records of type IDiscussionBoardComment.ISummary.
     */
    data: IDiscussionBoardComment.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummaryReport = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IDiscussionBoardComment.ISummaryReport.
     */
    data: IDiscussionBoardComment.ISummaryReport[];
  };
}
