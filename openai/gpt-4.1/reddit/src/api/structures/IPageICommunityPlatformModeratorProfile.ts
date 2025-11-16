import { IPage } from "./IPage";
import { ICommunityPlatformModeratorProfile } from "./ICommunityPlatformModeratorProfile";

export namespace IPageICommunityPlatformModeratorProfile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformModeratorProfile.ISummary[];
  };
}
