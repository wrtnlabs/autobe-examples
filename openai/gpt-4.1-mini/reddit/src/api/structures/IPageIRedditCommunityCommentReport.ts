import { IPage } from "./IPage";
import { IRedditCommunityCommentReport } from "./IRedditCommunityCommentReport";

export namespace IPageIRedditCommunityCommentReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityCommentReport.ISummary[];
  };
}
