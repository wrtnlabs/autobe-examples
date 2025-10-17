import { IPage } from "./IPage";
import { ICommunityPlatformReport } from "./ICommunityPlatformReport";

export namespace IPageICommunityPlatformReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformReport.ISummary[];
  };
}
