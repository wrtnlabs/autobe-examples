import { IPage } from "./IPage";
import { IShoppingPlatformAnnouncement } from "./IShoppingPlatformAnnouncement";

export namespace IPageIShoppingPlatformAnnouncement {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingPlatformAnnouncement.ISummary[];
  };
}
