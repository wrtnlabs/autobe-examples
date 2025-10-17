import { IPage } from "./IPage";
import { IRedditCommunityGuest } from "./IRedditCommunityGuest";

export namespace IPageIRedditCommunityGuest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityGuest.ISummary[];
  };
}
