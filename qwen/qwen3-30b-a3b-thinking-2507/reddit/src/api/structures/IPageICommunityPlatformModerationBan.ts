import { ICommunityPlatformModerationBan } from "./ICommunityPlatformModerationBan";
import { IPage } from "./IPage";

export namespace IPageICommunityPlatformModerationBan {
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
     * @x-autobe-specification List of records of type ICommunityPlatformModerationBan.ISummary.
     */
    data: ICommunityPlatformModerationBan.ISummary[];
  };
}
