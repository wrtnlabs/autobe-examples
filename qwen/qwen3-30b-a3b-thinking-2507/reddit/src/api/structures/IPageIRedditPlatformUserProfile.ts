import { IPage } from "./IPage";
import { IRedditPlatformUserProfile } from "./IRedditPlatformUserProfile";

export namespace IPageIRedditPlatformUserProfile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformUserProfile.ISummary[];
  };
}
