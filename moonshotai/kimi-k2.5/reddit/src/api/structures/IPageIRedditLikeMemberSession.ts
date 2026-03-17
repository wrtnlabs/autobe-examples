import { IPage } from "./IPage";
import { IRedditLikeMemberSession } from "./IRedditLikeMemberSession";

export namespace IPageIRedditLikeMemberSession {
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
     * @x-autobe-specification List of records of type IRedditLikeMemberSession.ISummary.
     */
    data: IRedditLikeMemberSession.ISummary[];
  };
}
