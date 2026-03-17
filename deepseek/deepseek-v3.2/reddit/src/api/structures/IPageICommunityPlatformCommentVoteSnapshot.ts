import { ICommunityPlatformCommentVoteSnapshot } from "./ICommunityPlatformCommentVoteSnapshot";
import { IPage } from "./IPage";

export namespace IPageICommunityPlatformCommentVoteSnapshot {
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
     * @x-autobe-specification List of records of type ICommunityPlatformCommentVoteSnapshot.ISummary.
     */
    data: ICommunityPlatformCommentVoteSnapshot.ISummary[];
  };
}
