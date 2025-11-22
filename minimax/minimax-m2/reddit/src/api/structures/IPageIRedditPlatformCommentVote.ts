import { IPage } from "./IPage";
import { IRedditPlatformCommentVote } from "./IRedditPlatformCommentVote";

export namespace IPageIRedditPlatformCommentVote {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformCommentVote.ISummary[];
  };
}
