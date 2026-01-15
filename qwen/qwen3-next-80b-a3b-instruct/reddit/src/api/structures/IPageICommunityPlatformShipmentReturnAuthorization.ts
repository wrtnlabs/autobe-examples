import { IPage } from "./IPage";
import { ICommunityPlatformShipmentReturnAuthorization } from "./ICommunityPlatformShipmentReturnAuthorization";

export namespace IPageICommunityPlatformShipmentReturnAuthorization {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformShipmentReturnAuthorization.ISummary[];
  };
}
