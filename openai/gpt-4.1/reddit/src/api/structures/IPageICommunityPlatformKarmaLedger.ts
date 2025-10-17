import { IPage } from "./IPage";
import { ICommunityPlatformKarmaLedger } from "./ICommunityPlatformKarmaLedger";

export namespace IPageICommunityPlatformKarmaLedger {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformKarmaLedger.ISummary[];
  };
}
