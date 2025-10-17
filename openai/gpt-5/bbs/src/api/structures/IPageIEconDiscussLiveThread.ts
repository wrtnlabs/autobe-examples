import { IPage } from "./IPage";
import { IEconDiscussLiveThread } from "./IEconDiscussLiveThread";

export namespace IPageIEconDiscussLiveThread {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconDiscussLiveThread.ISummary[];
  };
}
