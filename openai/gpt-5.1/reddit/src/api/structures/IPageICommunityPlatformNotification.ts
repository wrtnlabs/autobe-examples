import { IPage } from "./IPage";
import { ICommunityPlatformNotification } from "./ICommunityPlatformNotification";

export namespace IPageICommunityPlatformNotification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformNotification.ISummary[];
  };
}
