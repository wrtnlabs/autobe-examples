import { IPage } from "./IPage";
import { ICommunityPlatformKarmaAward } from "./ICommunityPlatformKarmaAward";

export namespace IPageICommunityPlatformKarmaAward {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformKarmaAward.ISummary[];
  };
}
