import { IPage } from "./IPage";
import { ICommunityPlatformNotificationSettings } from "./ICommunityPlatformNotificationSettings";

export namespace IPageICommunityPlatformNotificationSettings {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformNotificationSettings.ISummary[];
  };
}
