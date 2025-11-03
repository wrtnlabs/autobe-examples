import { IPage } from "./IPage";
import { ICommunityBbsPostSnapshot } from "./ICommunityBbsPostSnapshot";

export namespace IPageICommunityBbsPostSnapshot {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsPostSnapshot.ISummary[];
  };
}
