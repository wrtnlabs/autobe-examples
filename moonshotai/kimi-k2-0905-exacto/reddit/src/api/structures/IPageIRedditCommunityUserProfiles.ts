import { IPage } from "./IPage";
import { IRedditCommunityUserProfiles } from "./IRedditCommunityUserProfiles";

export namespace IPageIRedditCommunityUserProfiles {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityUserProfiles.ISummary[];
  };
}
