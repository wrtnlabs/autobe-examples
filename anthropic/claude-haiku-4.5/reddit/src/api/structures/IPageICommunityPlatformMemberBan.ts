import { IPage } from "./IPage";
import { ICommunityPlatformMemberBan } from "./ICommunityPlatformMemberBan";

export namespace IPageICommunityPlatformMemberBan {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformMemberBan.ISummary[];
  };
}
