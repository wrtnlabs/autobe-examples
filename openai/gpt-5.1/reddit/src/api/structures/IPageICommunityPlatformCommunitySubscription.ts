import { IPage } from "./IPage";
import { ICommunityPlatformCommunitySubscription } from "./ICommunityPlatformCommunitySubscription";

export namespace IPageICommunityPlatformCommunitySubscription {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommunitySubscription.ISummary[];
  };
}
