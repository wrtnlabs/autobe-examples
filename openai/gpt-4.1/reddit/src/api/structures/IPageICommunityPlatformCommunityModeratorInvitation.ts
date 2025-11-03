import { IPage } from "./IPage";
import { ICommunityPlatformCommunityModeratorInvitation } from "./ICommunityPlatformCommunityModeratorInvitation";

export namespace IPageICommunityPlatformCommunityModeratorInvitation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommunityModeratorInvitation.ISummary[];
  };
}
