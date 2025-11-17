import { IPage } from "./IPage";
import { IRedditCommunityCommentVote } from "./IRedditCommunityCommentVote";

export namespace IPageIRedditCommunityCommentVote {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityCommentVote.ISummary[];
  };
}
