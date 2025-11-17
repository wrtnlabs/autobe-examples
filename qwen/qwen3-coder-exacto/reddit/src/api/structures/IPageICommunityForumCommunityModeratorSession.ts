import { IPage } from "./IPage";
import { ICommunityForumCommunityModeratorSession } from "./ICommunityForumCommunityModeratorSession";

export namespace IPageICommunityForumCommunityModeratorSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityForumCommunityModeratorSession.ISummary[];
  };
}
