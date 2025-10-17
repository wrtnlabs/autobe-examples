import { IPage } from "./IPage";
import { ICommunityPlatformCommunityModeratorAssignment } from "./ICommunityPlatformCommunityModeratorAssignment";

export namespace IPageICommunityPlatformCommunityModeratorAssignment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommunityModeratorAssignment.ISummary[];
  };
}
