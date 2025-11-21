import { IPage } from "./IPage";
import { ICommunityPlatformVoteLimit } from "./ICommunityPlatformVoteLimit";

export namespace IPageICommunityPlatformVoteLimit {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformVoteLimit.ISummary[];
  };
}
