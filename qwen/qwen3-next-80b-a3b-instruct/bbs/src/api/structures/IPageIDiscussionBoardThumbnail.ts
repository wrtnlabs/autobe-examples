import { IPage } from "./IPage";
import { IDiscussionBoardThumbnail } from "./IDiscussionBoardThumbnail";

export namespace IPageIDiscussionBoardThumbnail {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardThumbnail.ISummary[];
  };
}
