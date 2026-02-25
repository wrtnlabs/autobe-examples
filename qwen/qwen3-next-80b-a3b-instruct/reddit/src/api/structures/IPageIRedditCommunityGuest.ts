import { IPage } from "./IPage";
import { IRedditCommunityGuest } from "./IRedditCommunityGuest";

export namespace IPageIRedditCommunityGuest {
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
     * @x-autobe-specification List of records of type IRedditCommunityGuest.ISum.
     */
    data: IRedditCommunityGuest.ISum[];
  };
}
