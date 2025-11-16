import { IPage } from "./IPage";
import { IRedditCommunityFaq } from "./IRedditCommunityFaq";

export namespace IPageIRedditCommunityFaq {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityFaq.ISummary[];
  };
}
