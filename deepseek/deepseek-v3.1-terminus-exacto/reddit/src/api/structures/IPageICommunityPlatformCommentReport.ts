import { IPage } from "./IPage";
import { ICommunityPlatformCommentReport } from "./ICommunityPlatformCommentReport";

export namespace IPageICommunityPlatformCommentReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommentReport.ISummary[];
  };
}
