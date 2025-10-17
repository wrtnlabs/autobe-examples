import { IPage } from "./IPage";
import { IEconDiscussPostVote } from "./IEconDiscussPostVote";

export namespace IPageIEconDiscussPostVote {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconDiscussPostVote.ISummary[];
  };
}
