import { IPage } from "./IPage";
import { IRedditCommunityReport } from "./IRedditCommunityReport";

export namespace IPageIRedditCommunityReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityReport.ISummary[];
  };
}
