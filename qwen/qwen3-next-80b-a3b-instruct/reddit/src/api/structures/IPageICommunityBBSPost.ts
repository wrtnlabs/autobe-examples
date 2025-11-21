import { IPage } from "./IPage";
import { ICommunityBBSPost } from "./ICommunityBBSPost";

export namespace IPageICommunityBBSPost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBBSPost.ISummary[];
  };
}
