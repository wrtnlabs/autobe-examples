import { IPage } from "./IPage";
import { IRedditCommunityPostReport } from "./IRedditCommunityPostReport";

export namespace IPageIRedditCommunityPostReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityPostReport.ISummary[];
  };
}
