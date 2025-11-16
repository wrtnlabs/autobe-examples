import { IPage } from "./IPage";
import { ICommunityPlatformCommunityStatusHistory } from "./ICommunityPlatformCommunityStatusHistory";

export namespace IPageICommunityPlatformCommunityStatusHistory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommunityStatusHistory.ISummary[];
  };
}
