import { IPage } from "./IPage";
import { IRedditPlatformModerationAppeal } from "./IRedditPlatformModerationAppeal";

export namespace IPageIRedditPlatformModerationAppeal {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformModerationAppeal.ISummary[];
  };
}
