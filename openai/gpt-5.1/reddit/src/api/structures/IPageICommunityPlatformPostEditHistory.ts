import { IPage } from "./IPage";
import { ICommunityPlatformPostEditHistory } from "./ICommunityPlatformPostEditHistory";

export namespace IPageICommunityPlatformPostEditHistory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPostEditHistory.ISummary[];
  };
}
