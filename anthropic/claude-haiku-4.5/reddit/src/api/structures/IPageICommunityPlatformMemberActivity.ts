import { IPage } from "./IPage";
import { ICommunityPlatformMemberActivity } from "./ICommunityPlatformMemberActivity";

export namespace IPageICommunityPlatformMemberActivity {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformMemberActivity.ISummary[];
  };
}
