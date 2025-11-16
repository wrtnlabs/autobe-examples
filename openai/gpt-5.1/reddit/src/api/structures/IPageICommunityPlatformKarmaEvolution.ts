import { IPage } from "./IPage";
import { ICommunityPlatformKarmaEvolution } from "./ICommunityPlatformKarmaEvolution";

export namespace IPageICommunityPlatformKarmaEvolution {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformKarmaEvolution.ISummary[];
  };
}
