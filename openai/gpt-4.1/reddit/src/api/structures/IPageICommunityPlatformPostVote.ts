import { IPage } from "./IPage";
import { ICommunityPlatformPostVote } from "./ICommunityPlatformPostVote";

export namespace IPageICommunityPlatformPostVote {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPostVote.ISummary[];
  };
}
