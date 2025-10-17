import { IPage } from "./IPage";
import { IRedditLikePost } from "./IRedditLikePost";

export namespace IPageIRedditLikePost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditLikePost.ISummary[];
  };
}
