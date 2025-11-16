import { IPage } from "./IPage";
import { ICommunityPlatformMemberuser } from "./ICommunityPlatformMemberuser";

export namespace IPageICommunityPlatformMemberuser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformMemberuser.ISummary[];
  };
}
