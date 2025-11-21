import { IPage } from "./IPage";
import { ICommunityPlatformUserBan } from "./ICommunityPlatformUserBan";

export namespace IPageICommunityPlatformUserBan {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformUserBan.ISummary[];
  };
}
