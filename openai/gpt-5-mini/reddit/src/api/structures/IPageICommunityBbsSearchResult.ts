import { IPage } from "./IPage";
import { ICommunityBbsSearchResult } from "./ICommunityBbsSearchResult";

export namespace IPageICommunityBbsSearchResult {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsSearchResult.ISummary[];
  };
}
