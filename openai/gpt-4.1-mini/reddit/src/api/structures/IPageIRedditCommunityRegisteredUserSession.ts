import { IPage } from "./IPage";
import { IRedditCommunityRegistereduserSession } from "./IRedditCommunityRegistereduserSession";

export namespace IPageIRedditCommunityRegistereduserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityRegistereduserSession.ISummary[];
  };
}
