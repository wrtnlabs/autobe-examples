import { IPage } from "./IPage";
import { ICommunityBbsPushToken } from "./ICommunityBbsPushToken";

export namespace IPageICommunityBbsPushToken {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsPushToken.ISummary[];
  };
}
