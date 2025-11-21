import { IPage } from "./IPage";
import { ICommunityBBSComplianceAlert } from "./ICommunityBBSComplianceAlert";

export namespace IPageICommunityBBSComplianceAlert {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBBSComplianceAlert.ISummary[];
  };
}
