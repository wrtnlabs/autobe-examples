import { IPage } from "./IPage";
import { IRedditCommunityAdmin } from "./IRedditCommunityAdmin";

export namespace IPageIRedditCommunityAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityAdmin.ISummary[];
  };
}
