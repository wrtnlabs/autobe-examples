import { IPage } from "./IPage";
import { ICommunityPlatformKarmaEvent } from "./ICommunityPlatformKarmaEvent";

export namespace IPageICommunityPlatformKarmaEvent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformKarmaEvent.ISummary[];
  };
}
