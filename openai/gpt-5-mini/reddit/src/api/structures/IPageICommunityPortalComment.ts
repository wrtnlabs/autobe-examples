import { IPage } from "./IPage";
import { ICommunityPortalComment } from "./ICommunityPortalComment";

export namespace IPageICommunityPortalComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPortalComment.ISummary[];
  };
}
