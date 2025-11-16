import { IPage } from "./IPage";
import { IRedditCommunityVoteType } from "./IRedditCommunityVoteType";

export namespace IPageIRedditCommunityVoteType {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityVoteType.ISummary[];
  };
}
