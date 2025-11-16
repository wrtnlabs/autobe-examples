import { IPage } from "./IPage";
import { ICommunityPlatformDiscoveryHomeFeed } from "./ICommunityPlatformDiscoveryHomeFeed";

export namespace IPageICommunityPlatformDiscoveryHomeFeed {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformDiscoveryHomeFeed.ISummary[];
  };
}
