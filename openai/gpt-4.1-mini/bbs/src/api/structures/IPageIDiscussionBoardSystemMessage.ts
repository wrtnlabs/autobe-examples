import { IDiscussionBoardSystemMessage } from "./IDiscussionBoardSystemMessage";
import { IPage } from "./IPage";

export namespace IPageIDiscussionBoardSystemMessage {
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
     * @x-autobe-specification List of records of type IDiscussionBoardSystemMessage.ISummary.
     */
    data: IDiscussionBoardSystemMessage.ISummary[];
  };
}
