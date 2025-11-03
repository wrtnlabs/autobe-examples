import { IPage } from "./IPage";
import { IRedditCommunityUser } from "./IRedditCommunityUser";

export namespace IPageIRedditCommunityUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityUser.ISummary[];
  };
}
