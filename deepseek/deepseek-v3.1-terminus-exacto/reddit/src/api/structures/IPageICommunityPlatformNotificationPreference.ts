import { IPage } from "./IPage";
import { ICommunityPlatformNotificationPreference } from "./ICommunityPlatformNotificationPreference";

export namespace IPageICommunityPlatformNotificationPreference {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformNotificationPreference.ISummary[];
  };
}
