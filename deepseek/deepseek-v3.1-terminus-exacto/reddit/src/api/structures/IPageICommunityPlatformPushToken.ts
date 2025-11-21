import { IPage } from "./IPage";
import { ICommunityPlatformPushToken } from "./ICommunityPlatformPushToken";

export namespace IPageICommunityPlatformPushToken {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPushToken.ISummary[];
  };
}
