import { IPage } from "./IPage";
import { IRedditCommunityUserKarma } from "./IRedditCommunityUserKarma";

export namespace IPageIRedditCommunityUserKarma {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityUserKarma.ISummary[];
  };
}
