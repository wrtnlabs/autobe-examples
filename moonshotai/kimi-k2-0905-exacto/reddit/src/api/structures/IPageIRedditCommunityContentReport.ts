import { IPage } from "./IPage";
import { IRedditCommunityContentReport } from "./IRedditCommunityContentReport";

export namespace IPageIRedditCommunityContentReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityContentReport.ISummary[];
  };
}
