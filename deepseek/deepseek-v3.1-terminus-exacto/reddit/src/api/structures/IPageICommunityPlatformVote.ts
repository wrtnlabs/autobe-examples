import { IPage } from "./IPage";
import { ICommunityPlatformVote } from "./ICommunityPlatformVote";

export namespace IPageICommunityPlatformVote {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformVote.ISummary[];
  };
}
