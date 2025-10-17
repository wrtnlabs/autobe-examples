import { IPage } from "./IPage";
import { IRedditCommunityReportStatus } from "./IRedditCommunityReportStatus";

export namespace IPageIRedditCommunityReportStatus {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityReportStatus.ISummary[];
  };
}
