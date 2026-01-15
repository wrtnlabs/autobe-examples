import { IPage } from "./IPage";
import { ICommunityPlatformGuestSession } from "./ICommunityPlatformGuestSession";

export namespace IPageICommunityPlatformGuestSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformGuestSession.ISummary[];
  };
}
