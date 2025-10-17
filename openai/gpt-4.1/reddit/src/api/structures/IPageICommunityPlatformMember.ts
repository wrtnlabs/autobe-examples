import { IPage } from "./IPage";
import { ICommunityPlatformMember } from "./ICommunityPlatformMember";

export namespace IPageICommunityPlatformMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformMember.ISummary[];
  };
}
