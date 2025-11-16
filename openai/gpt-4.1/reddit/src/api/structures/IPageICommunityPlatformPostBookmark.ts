import { IPage } from "./IPage";
import { ICommunityPlatformPostBookmark } from "./ICommunityPlatformPostBookmark";

export namespace IPageICommunityPlatformPostBookmark {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPostBookmark.ISummary[];
  };
}
