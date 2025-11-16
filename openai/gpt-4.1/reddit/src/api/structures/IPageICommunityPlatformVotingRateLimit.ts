import { IPage } from "./IPage";
import { ICommunityPlatformVotingRateLimit } from "./ICommunityPlatformVotingRateLimit";

export namespace IPageICommunityPlatformVotingRateLimit {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformVotingRateLimit.ISummary[];
  };
}
