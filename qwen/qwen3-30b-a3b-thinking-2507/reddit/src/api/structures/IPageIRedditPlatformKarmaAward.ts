import { IPage } from "./IPage";
import { IRedditPlatformKarmaAward } from "./IRedditPlatformKarmaAward";

export namespace IPageIRedditPlatformKarmaAward {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformKarmaAward.ISummary[];
  };
}
