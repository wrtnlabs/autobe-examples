import { IPage } from "./IPage";
import { ICommunityBbsPost } from "./ICommunityBbsPost";

export namespace IPageICommunityBbsPost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsPost.ISummary[];
  };
}
