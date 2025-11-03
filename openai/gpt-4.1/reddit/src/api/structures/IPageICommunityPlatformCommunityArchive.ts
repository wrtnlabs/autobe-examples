import { IPage } from "./IPage";
import { ICommunityPlatformCommunityArchive } from "./ICommunityPlatformCommunityArchive";

export namespace IPageICommunityPlatformCommunityArchive {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommunityArchive.ISummary[];
  };
}
