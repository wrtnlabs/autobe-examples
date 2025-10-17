import { IPage } from "./IPage";
import { ICommunityPlatformKarmaPenalty } from "./ICommunityPlatformKarmaPenalty";

export namespace IPageICommunityPlatformKarmaPenalty {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformKarmaPenalty.ISummary[];
  };
}
