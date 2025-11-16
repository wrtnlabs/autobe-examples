import { IPage } from "./IPage";
import { ICommunityPlatformFeedPost } from "./ICommunityPlatformFeedPost";

export namespace IPageICommunityPlatformFeedPost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformFeedPost.ISummary[];
  };
}
