import { IPage } from "./IPage";
import { IRedditPlatformLoginAttempt } from "./IRedditPlatformLoginAttempt";

export namespace IPageIRedditPlatformLoginAttempt {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformLoginAttempt.ISummary[];
  };
}
