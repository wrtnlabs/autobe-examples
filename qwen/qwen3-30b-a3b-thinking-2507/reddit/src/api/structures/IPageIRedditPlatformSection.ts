import { IPage } from "./IPage";
import { IRedditPlatformSection } from "./IRedditPlatformSection";

export namespace IPageIRedditPlatformSection {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformSection.ISummary[];
  };
}
