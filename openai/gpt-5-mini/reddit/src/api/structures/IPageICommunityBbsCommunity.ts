import { IPage } from "./IPage";
import { ICommunityBbsCommunity } from "./ICommunityBbsCommunity";

export namespace IPageICommunityBbsCommunity {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsCommunity.ISummary[];
  };
}
