import { IPage } from "./IPage";
import { IRedditCommunityPlatformModerator } from "./IRedditCommunityPlatformModerator";

export namespace IPageIRedditCommunityPlatformModerator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityPlatformModerator.ISummary[];
  };
}
