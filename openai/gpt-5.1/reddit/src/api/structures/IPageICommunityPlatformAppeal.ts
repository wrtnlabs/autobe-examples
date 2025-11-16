import { IPage } from "./IPage";
import { ICommunityPlatformAppeal } from "./ICommunityPlatformAppeal";

export namespace IPageICommunityPlatformAppeal {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformAppeal.ISummary[];
  };
}
