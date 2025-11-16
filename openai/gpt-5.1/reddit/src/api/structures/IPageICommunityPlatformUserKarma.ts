import { IPage } from "./IPage";
import { ICommunityPlatformUserKarma } from "./ICommunityPlatformUserKarma";

export namespace IPageICommunityPlatformUserKarma {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformUserKarma.ISummary[];
  };
}
