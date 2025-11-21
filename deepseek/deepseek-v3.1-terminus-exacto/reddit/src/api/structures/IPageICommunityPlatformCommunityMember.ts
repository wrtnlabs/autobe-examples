import { IPage } from "./IPage";
import { ICommunityPlatformCommunityMember } from "./ICommunityPlatformCommunityMember";

export namespace IPageICommunityPlatformCommunityMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommunityMember.ISummary[];
  };
}
