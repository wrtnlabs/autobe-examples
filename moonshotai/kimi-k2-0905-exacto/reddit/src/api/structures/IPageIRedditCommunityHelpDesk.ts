import { IPage } from "./IPage";
import { IRedditCommunityHelpDesk } from "./IRedditCommunityHelpDesk";

export namespace IPageIRedditCommunityHelpDesk {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityHelpDesk.ISummary[];
  };
}
