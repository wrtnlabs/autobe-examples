import { IPage } from "./IPage";
import { IRedditLikeMember } from "./IRedditLikeMember";

export namespace IPageIRedditLikeMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditLikeMember.ISummary[];
  };
}
