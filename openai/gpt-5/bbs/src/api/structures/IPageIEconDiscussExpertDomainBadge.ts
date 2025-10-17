import { IPage } from "./IPage";
import { IEconDiscussExpertDomainBadge } from "./IEconDiscussExpertDomainBadge";

export namespace IPageIEconDiscussExpertDomainBadge {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconDiscussExpertDomainBadge.ISummary[];
  };
}
