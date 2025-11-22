import { IPage } from "./IPage";
import { IRedditPlatformComment } from "./IRedditPlatformComment";

export namespace IPageIRedditPlatformComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformComment.ISummary[];
  };
}
