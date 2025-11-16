import { IPage } from "./IPage";
import { ICommunityPlatformCommentAnalytics } from "./ICommunityPlatformCommentAnalytics";

export namespace IPageICommunityPlatformCommentAnalytics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommentAnalytics.ISummary[];
  };
}
