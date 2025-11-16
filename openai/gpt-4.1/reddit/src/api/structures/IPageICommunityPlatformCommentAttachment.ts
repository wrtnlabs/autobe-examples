import { IPage } from "./IPage";
import { ICommunityPlatformCommentAttachment } from "./ICommunityPlatformCommentAttachment";

export namespace IPageICommunityPlatformCommentAttachment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommentAttachment.ISummary[];
  };
}
