import { IPage } from "./IPage";
import { ICommunityPlatformNotificationEvent } from "./ICommunityPlatformNotificationEvent";

export namespace IPageICommunityPlatformNotificationEvent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformNotificationEvent.ISummary[];
  };
}
