import { IPage } from "./IPage";
import { ICommunityPlatformCarrier } from "./ICommunityPlatformCarrier";

export namespace IPageICommunityPlatformCarrier {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCarrier.ISummary[];
  };
}
