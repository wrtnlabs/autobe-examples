import { IPage } from "./IPage";
import { ICommunityPlatformUserProfile } from "./ICommunityPlatformUserProfile";

export namespace IPageICommunityPlatformUserProfile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformUserProfile.ISummary[];
  };
}
