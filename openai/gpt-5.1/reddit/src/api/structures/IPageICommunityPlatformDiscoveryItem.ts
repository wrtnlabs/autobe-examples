import { IPage } from "./IPage";
import { ICommunityPlatformDiscoveryItem } from "./ICommunityPlatformDiscoveryItem";

export namespace IPageICommunityPlatformDiscoveryItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformDiscoveryItem.ISummary[];
  };
}
