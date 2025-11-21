import { IPage } from "./IPage";
import { ICommunityPlatformSection } from "./ICommunityPlatformSection";

export namespace IPageICommunityPlatformSection {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformSection.ISummary[];
  };
}
