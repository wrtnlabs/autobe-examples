import { IPage } from "./IPage";
import { ICommunityPlatformNotificationTemplate } from "./ICommunityPlatformNotificationTemplate";

export namespace IPageICommunityPlatformNotificationTemplate {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformNotificationTemplate.ISummary[];
  };
}
