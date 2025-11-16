import { IPage } from "./IPage";
import { IRedditCommunityCommunityInvitation } from "./IRedditCommunityCommunityInvitation";

export namespace IPageIRedditCommunityCommunityInvitation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityCommunityInvitation.ISummary[];
  };
}
