import { IPage } from "./IPage";
import { ICommunityBBSComment } from "./ICommunityBBSComment";

export namespace IPageICommunityBBSComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBBSComment.ISummary[];
  };
}
