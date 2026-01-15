import { IPage } from "./IPage";
import { IRedditPlatformConfiguration } from "./IRedditPlatformConfiguration";

export namespace IPageIRedditPlatformConfiguration {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformConfiguration.ISummary[];
  };
}
