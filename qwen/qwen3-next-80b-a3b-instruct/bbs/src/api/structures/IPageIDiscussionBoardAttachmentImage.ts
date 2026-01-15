import { IPage } from "./IPage";
import { IDiscussionBoardAttachmentImage } from "./IDiscussionBoardAttachmentImage";

export namespace IPageIDiscussionBoardAttachmentImage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardAttachmentImage.ISummary[];
  };
}
