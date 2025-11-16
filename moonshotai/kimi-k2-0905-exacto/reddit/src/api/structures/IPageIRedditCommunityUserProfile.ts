import { IPage } from "./IPage";
import { IRedditCommunityUserProfile } from "./IRedditCommunityUserProfile";

export namespace IPageIRedditCommunityUserProfile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityUserProfile.ISummary[];
  };
}
