import { IPage } from "./IPage";
import { ICommunityPortalCommunity } from "./ICommunityPortalCommunity";

export namespace IPageICommunityPortalCommunity {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPortalCommunity.ISummary[];
  };
}
