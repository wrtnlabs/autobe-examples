import { IPage } from "./IPage";
import { ICommunityPlatformEnvironment } from "./ICommunityPlatformEnvironment";

export namespace IPageICommunityPlatformEnvironment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformEnvironment.ISummary[];
  };
}
