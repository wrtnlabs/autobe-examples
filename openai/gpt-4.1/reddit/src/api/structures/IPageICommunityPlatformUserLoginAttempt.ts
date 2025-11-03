import { IPage } from "./IPage";
import { ICommunityPlatformUserLoginAttempt } from "./ICommunityPlatformUserLoginAttempt";

export namespace IPageICommunityPlatformUserLoginAttempt {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformUserLoginAttempt.ISummary[];
  };
}
