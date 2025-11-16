import { IPage } from "./IPage";
import { ICommunityPlatformCommentBookmark } from "./ICommunityPlatformCommentBookmark";

export namespace IPageICommunityPlatformCommentBookmark {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommentBookmark.ISummary[];
  };
}
