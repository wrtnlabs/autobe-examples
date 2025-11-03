import { IPage } from "./IPage";
import { ICommunityBbsMvCommunityBbsDailyStat } from "./ICommunityBbsMvCommunityBbsDailyStat";

export namespace IPageICommunityBbsMvCommunityBbsDailyStat {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsMvCommunityBbsDailyStat.ISummary[];
  };
}
