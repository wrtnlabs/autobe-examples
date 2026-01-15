import { IPage } from "./IPage";
import { IRedditPlatformChannel } from "./IRedditPlatformChannel";

export namespace IPageIRedditPlatformChannel {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformChannel.ISummary[];
  };
}
