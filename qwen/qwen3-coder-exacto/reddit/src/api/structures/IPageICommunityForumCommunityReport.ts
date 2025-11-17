import { IPage } from "./IPage";
import { ICommunityForumCommunityReport } from "./ICommunityForumCommunityReport";

export namespace IPageICommunityForumCommunityReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityForumCommunityReport.ISummary[];
  };
}
