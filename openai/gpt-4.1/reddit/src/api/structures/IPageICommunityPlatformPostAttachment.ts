import { IPage } from "./IPage";
import { ICommunityPlatformPostAttachment } from "./ICommunityPlatformPostAttachment";

export namespace IPageICommunityPlatformPostAttachment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPostAttachment.ISummary[];
  };
}
