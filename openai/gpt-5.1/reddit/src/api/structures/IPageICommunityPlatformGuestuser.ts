import { IPage } from "./IPage";
import { ICommunityPlatformGuestuser } from "./ICommunityPlatformGuestuser";

export namespace IPageICommunityPlatformGuestuser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformGuestuser.ISummary[];
  };
}
