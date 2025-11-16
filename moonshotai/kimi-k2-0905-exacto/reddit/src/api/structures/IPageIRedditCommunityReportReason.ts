import { IPage } from "./IPage";
import { IRedditCommunityReportReason } from "./IRedditCommunityReportReason";

export namespace IPageIRedditCommunityReportReason {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityReportReason.ISummary[];
  };
}
