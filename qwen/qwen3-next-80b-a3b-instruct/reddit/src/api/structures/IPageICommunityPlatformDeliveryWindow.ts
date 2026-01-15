import { IPage } from "./IPage";
import { ICommunityPlatformDeliveryWindow } from "./ICommunityPlatformDeliveryWindow";

export namespace IPageICommunityPlatformDeliveryWindow {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformDeliveryWindow.ISummary[];
  };
}
