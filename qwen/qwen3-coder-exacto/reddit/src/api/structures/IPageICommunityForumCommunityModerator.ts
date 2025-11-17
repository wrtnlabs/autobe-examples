import { IPage } from "./IPage";
import { ICommunityForumCommunityModerator } from "./ICommunityForumCommunityModerator";

export namespace IPageICommunityForumCommunityModerator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityForumCommunityModerator.ISummary[];
  };
}
