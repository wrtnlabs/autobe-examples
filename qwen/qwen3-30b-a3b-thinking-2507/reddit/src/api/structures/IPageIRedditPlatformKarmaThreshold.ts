import { IPage } from "./IPage";
import { IRedditPlatformKarmaThreshold } from "./IRedditPlatformKarmaThreshold";

export namespace IPageIRedditPlatformKarmaThreshold {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformKarmaThreshold.ISummary[];
  };
}
