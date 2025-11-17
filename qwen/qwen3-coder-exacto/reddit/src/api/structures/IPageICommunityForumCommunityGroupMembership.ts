import { IPage } from "./IPage";
import { ICommunityForumCommunityGroupMembership } from "./ICommunityForumCommunityGroupMembership";

export namespace IPageICommunityForumCommunityGroupMembership {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityForumCommunityGroupMembership.ISummary[];
  };
}
