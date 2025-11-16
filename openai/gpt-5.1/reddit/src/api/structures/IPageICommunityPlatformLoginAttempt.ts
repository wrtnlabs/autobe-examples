import { IPage } from "./IPage";
import { ICommunityPlatformLoginAttempt } from "./ICommunityPlatformLoginAttempt";

export namespace IPageICommunityPlatformLoginAttempt {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformLoginAttempt.ISummary[];
  };
}
