import { IPage } from "./IPage";
import { ICommunityForumCommunityModerationAction } from "./ICommunityForumCommunityModerationAction";

export namespace IPageICommunityForumCommunityModerationAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityForumCommunityModerationAction.ISummary[];
  };
}
