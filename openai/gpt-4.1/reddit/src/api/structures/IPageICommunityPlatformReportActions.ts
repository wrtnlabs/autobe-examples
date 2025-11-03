import { IPage } from "./IPage";
import { ICommunityPlatformReportActions } from "./ICommunityPlatformReportActions";

export namespace IPageICommunityPlatformReportActions {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformReportActions.ISummary[];
  };
}
