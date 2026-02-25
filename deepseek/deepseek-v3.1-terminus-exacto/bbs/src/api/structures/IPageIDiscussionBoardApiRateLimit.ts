import { IDiscussionBoardApiRateLimit } from "./IDiscussionBoardApiRateLimit";
import { IPageIDiscussionBoardSection } from "./IPageIDiscussionBoardSection";

export namespace IPageIDiscussionBoardApiRateLimit {
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
     * @x-autobe-specification List of records of type IDiscussionBoardApiRateLimit.ISummary.
     */
    data: IDiscussionBoardApiRateLimit.ISummary[];
  };
}
