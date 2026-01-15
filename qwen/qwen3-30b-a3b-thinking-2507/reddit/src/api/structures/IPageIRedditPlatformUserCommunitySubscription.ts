import { IPage } from "./IPage";
import { IRedditPlatformUserCommunitySubscription } from "./IRedditPlatformUserCommunitySubscription";

export namespace IPageIRedditPlatformUserCommunitySubscription {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformUserCommunitySubscription.ISummary[];
  };
}
