import { IPage } from "./IPage";
import { ICommunityPlatformGlobalConstraint } from "./ICommunityPlatformGlobalConstraint";

export namespace IPageICommunityPlatformGlobalConstraint {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformGlobalConstraint.ISummary[];
  };
}
