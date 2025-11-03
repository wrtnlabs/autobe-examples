import { IPage } from "./IPage";
import { ICommunityBbsCommunityMember } from "./ICommunityBbsCommunityMember";

export namespace IPageICommunityBbsCommunityMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsCommunityMember.ISummary[];
  };
}
