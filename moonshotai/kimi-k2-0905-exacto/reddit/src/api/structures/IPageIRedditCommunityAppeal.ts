import { IPage } from "./IPage";
import { IRedditCommunityAppeal } from "./IRedditCommunityAppeal";

export namespace IPageIRedditCommunityAppeal {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityAppeal.ISummary[];
  };
}
