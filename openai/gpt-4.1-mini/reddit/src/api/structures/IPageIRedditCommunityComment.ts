import { IPage } from "./IPage";
import { IRedditCommunityComment } from "./IRedditCommunityComment";

export namespace IPageIRedditCommunityComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityComment.ISummary[];
  };
}
