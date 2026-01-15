import { IPage } from "./IPage";
import { IRedditPlatformKarmaTransaction } from "./IRedditPlatformKarmaTransaction";

export namespace IPageIRedditPlatformKarmaTransaction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformKarmaTransaction.ISummary[];
  };
}
