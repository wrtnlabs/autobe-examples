import { IPage } from "./IPage";
import { IRedditCommunityKarmaCalculation } from "./IRedditCommunityKarmaCalculation";

export namespace IPageIRedditCommunityKarmaCalculation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityKarmaCalculation.ISummary[];
  };
}
