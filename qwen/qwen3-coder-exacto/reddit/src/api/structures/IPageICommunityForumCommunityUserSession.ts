import { IPage } from "./IPage";
import { ICommunityForumCommunityUserSession } from "./ICommunityForumCommunityUserSession";

export namespace IPageICommunityForumCommunityUserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityForumCommunityUserSession.ISummary[];
  };
}
