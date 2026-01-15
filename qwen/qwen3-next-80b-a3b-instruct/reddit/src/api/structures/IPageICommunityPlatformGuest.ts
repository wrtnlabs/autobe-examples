import { IPage } from "./IPage";
import { ICommunityPlatformGuest } from "./ICommunityPlatformGuest";

export namespace IPageICommunityPlatformGuest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformGuest.ISummary[];
  };
}
