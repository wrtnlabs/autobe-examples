import { IPage } from "./IPage";
import { ICommunityPlatformContentQuarantine } from "./ICommunityPlatformContentQuarantine";

export namespace IPageICommunityPlatformContentQuarantine {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformContentQuarantine.ISummary[];
  };
}
