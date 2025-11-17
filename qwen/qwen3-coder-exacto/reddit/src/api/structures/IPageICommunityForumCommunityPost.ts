import { IPage } from "./IPage";
import { ICommunityForumCommunityPost } from "./ICommunityForumCommunityPost";

export namespace IPageICommunityForumCommunityPost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityForumCommunityPost.ISummary[];
  };
}
