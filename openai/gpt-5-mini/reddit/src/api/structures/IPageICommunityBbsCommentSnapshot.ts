import { IPage } from "./IPage";
import { ICommunityBbsCommentSnapshot } from "./ICommunityBbsCommentSnapshot";

export namespace IPageICommunityBbsCommentSnapshot {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsCommentSnapshot.ISummary[];
  };
}
