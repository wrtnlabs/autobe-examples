import { IPage } from "./IPage";
import { ICommunityPlatformSubscription } from "./ICommunityPlatformSubscription";

export namespace IPageICommunityPlatformSubscription {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformSubscription.ISummary[];
  };
}
