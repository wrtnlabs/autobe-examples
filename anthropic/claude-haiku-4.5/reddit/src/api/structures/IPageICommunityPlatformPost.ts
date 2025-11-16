import { IPage } from "./IPage";
import { ICommunityPlatformPost } from "./ICommunityPlatformPost";

export namespace IPageICommunityPlatformPost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPost.ISummary[];
  };
}
