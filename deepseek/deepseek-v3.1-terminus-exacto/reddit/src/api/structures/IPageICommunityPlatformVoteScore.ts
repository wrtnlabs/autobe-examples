import { IPage } from "./IPage";
import { ICommunityPlatformVoteScore } from "./ICommunityPlatformVoteScore";

export namespace IPageICommunityPlatformVoteScore {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformVoteScore.ISummary[];
  };
}
