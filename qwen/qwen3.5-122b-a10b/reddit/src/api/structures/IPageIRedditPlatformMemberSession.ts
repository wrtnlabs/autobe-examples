import { IPage } from "./IPage";
import { IRedditPlatformMemberSession } from "./IRedditPlatformMemberSession";

export namespace IPageIRedditPlatformMemberSession {
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
     * @x-autobe-specification List of records of type IRedditPlatformMemberSession.ISummary.
     */
    data: IRedditPlatformMemberSession.ISummary[];
  };
}
