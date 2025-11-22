import { IPage } from "./IPage";
import { IRedditPlatformAnnouncement } from "./IRedditPlatformAnnouncement";

export namespace IPageIRedditPlatformAnnouncement {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformAnnouncement.ISummary[];
  };
}
