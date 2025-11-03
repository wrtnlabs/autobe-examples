import { IPage } from "./IPage";
import { ICommunityBbsCommunityMemberSession } from "./ICommunityBbsCommunityMemberSession";

export namespace IPageICommunityBbsCommunityMemberSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsCommunityMemberSession.ISummary[];
  };
}
