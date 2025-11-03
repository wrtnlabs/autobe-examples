import { IPage } from "./IPage";
import { ICommunityBbsComment } from "./ICommunityBbsComment";

export namespace IPageICommunityBbsComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsComment.ISummary[];
  };
}
