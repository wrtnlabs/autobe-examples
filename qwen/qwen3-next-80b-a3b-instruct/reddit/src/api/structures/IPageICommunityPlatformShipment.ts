import { IPage } from "./IPage";
import { ICommunityPlatformShipment } from "./ICommunityPlatformShipment";

export namespace IPageICommunityPlatformShipment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformShipment.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ICostBreakdown = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformShipment.ICostBreakdown[];
  };
}
