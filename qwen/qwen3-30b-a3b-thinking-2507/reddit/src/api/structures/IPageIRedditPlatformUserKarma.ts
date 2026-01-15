import { IPage } from "./IPage";
import { IRedditPlatformUserKarma } from "./IRedditPlatformUserKarma";

export namespace IPageIRedditPlatformUserKarma {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformUserKarma.ISummary[];
  };
}
