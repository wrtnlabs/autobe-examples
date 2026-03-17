import { ICommunityPlatformFile } from "./ICommunityPlatformFile";
import { IPage } from "./IPage";

export namespace IPageICommunityPlatformFile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type ICommunityPlatformFile.ISummary.
     */
    data: ICommunityPlatformFile.ISummary[];
  };
}
