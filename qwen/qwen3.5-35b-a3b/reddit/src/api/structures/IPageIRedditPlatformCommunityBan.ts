import { IPage } from "./IPage";
import { IRedditPlatformCommunityBan } from "./IRedditPlatformCommunityBan";

export namespace IPageIRedditPlatformCommunityBan {
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
     * @x-autobe-specification List of records of type IRedditPlatformCommunityBan.ISummary.
     */
    data: IRedditPlatformCommunityBan.ISummary[];
  };
}
