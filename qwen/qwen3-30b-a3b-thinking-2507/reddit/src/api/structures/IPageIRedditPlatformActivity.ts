import { IPage } from "./IPage";
import { IRedditPlatformActivity } from "./IRedditPlatformActivity";

export namespace IPageIRedditPlatformActivity {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformActivity.ISummary[];
  };
}
