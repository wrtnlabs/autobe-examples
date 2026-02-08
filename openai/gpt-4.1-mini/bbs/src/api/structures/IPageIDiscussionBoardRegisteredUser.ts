import { IDiscussionBoardRegisteredUser } from "./IDiscussionBoardRegisteredUser";
import { IPage } from "./IPage";

export namespace IPageIDiscussionBoardRegisteredUser {
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
     * @x-autobe-specification List of records of type IDiscussionBoardRegisteredUser.ISummary.
     */
    data: IDiscussionBoardRegisteredUser.ISummary[];
  };
}
