import { ICommunityPlatformPost } from "./ICommunityPlatformPost";
import { IPage } from "./IPage";

export namespace IPageICommunityPlatformPost {
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
     * @x-autobe-specification List of records of type ICommunityPlatformPost.ISummary.
     */
    data: ICommunityPlatformPost.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISum = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type ICommunityPlatformPost.ISum.
     */
    data: ICommunityPlatformPost.ISum[];
  };
}
