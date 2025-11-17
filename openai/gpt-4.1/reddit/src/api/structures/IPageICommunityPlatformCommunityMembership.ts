import { IPage } from "./IPage";
import { ICommunityPlatformCommunityMembership } from "./ICommunityPlatformCommunityMembership";

export namespace IPageICommunityPlatformCommunityMembership {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommunityMembership.ISummary[];
  };
}
