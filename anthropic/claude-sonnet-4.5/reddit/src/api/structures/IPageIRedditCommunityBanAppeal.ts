import { IPage } from "./IPage";
import { IRedditCommunityBanAppeal } from "./IRedditCommunityBanAppeal";

export namespace IPageIRedditCommunityBanAppeal {
  /**
   * Paginated response containing ban appeal summary records.
   *
   * This wrapper type encapsulates a page of ban appeal data returned from
   * search and listing operations. It combines the actual appeal records with
   * pagination metadata, enabling clients to navigate through large result
   * sets efficiently.
   *
   * The pagination property provides essential metadata including current
   * page number, page size limit, total record count, and total page count.
   * This information allows clients to implement pagination controls, display
   * progress indicators, and prefetch adjacent pages.
   *
   * The data array contains the actual ban appeal summary records for the
   * current page, with each element providing lightweight appeal information
   * optimized for list displays in moderator queues and appeal management
   * interfaces. The array length will not exceed the configured page size
   * limit.
   *
   * This response type is used by moderator operations that retrieve ban
   * appeal lists, supporting both global appeal searches across all
   * communities and community-specific appeal queues. It enables efficient
   * processing of appeal workflows while maintaining performance for
   * moderators managing high volumes of appeals.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityBanAppeal.ISummary[];
  };
}
