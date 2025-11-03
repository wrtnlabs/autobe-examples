import { IPage } from "./IPage";
import { IRedditCommunityContentType } from "./IRedditCommunityContentType";

export namespace IPageIRedditCommunityContentType {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityContentType.ISummary[];
  };
}
