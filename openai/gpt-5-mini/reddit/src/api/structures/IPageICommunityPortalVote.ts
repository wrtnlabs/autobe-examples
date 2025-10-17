import { IPage } from "./IPage";
import { ICommunityPortalVote } from "./ICommunityPortalVote";

export namespace IPageICommunityPortalVote {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPortalVote.ISummary[];
  };
}
