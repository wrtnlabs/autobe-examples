import { IPage } from "./IPage";
import { IRedditPlatformCommunityCommunities } from "./IRedditPlatformCommunityCommunities";

export namespace IPageIRedditPlatformCommunityCommunities {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformCommunityCommunities.ISummary[];
  };
}
