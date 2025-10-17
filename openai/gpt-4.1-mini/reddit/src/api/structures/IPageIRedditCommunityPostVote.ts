import { IPage } from "./IPage";
import { IRedditCommunityPostVote } from "./IRedditCommunityPostVote";

export namespace IPageIRedditCommunityPostVote {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityPostVote.ISummary[];
  };
}
