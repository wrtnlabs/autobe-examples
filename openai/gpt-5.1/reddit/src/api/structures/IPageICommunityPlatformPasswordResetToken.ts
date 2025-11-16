import { IPage } from "./IPage";
import { ICommunityPlatformPasswordResetToken } from "./ICommunityPlatformPasswordResetToken";

export namespace IPageICommunityPlatformPasswordResetToken {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPasswordResetToken.ISummary[];
  };
}
