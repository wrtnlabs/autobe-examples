import { IPage } from "./IPage";
import { ICommunityPlatformAdminLoginAttempt } from "./ICommunityPlatformAdminLoginAttempt";

export namespace IPageICommunityPlatformAdminLoginAttempt {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformAdminLoginAttempt.ISummary[];
  };
}
