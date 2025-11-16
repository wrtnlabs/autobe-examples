import { IPage } from "./IPage";
import { IDiscussionBoardModerator } from "./IDiscussionBoardModerator";

export namespace IPageIDiscussionBoardModerator {
  /**
   * Paginated response containing discussion board moderator summaries.
   *
   * This response type wraps a collection of moderator records with
   * pagination metadata, enabling efficient browsing and management of the
   * moderator roster. Used in administrative interfaces where moderators need
   * to search, filter, and review other moderators based on various criteria
   * such as username, email, account status, or registration dates.
   *
   * The pagination structure prevents overwhelming clients with large
   * moderator datasets by breaking results into manageable pages. Each page
   * contains moderator summary information optimized for list displays,
   * providing essential identification and profile details without including
   * sensitive authentication data or full moderator profiles.
   *
   * This paginated response is returned by moderator search and listing
   * operations, supporting advanced filtering, sorting, and search
   * capabilities. The response structure ensures consistent pagination
   * behavior across all moderator management endpoints in the discussion
   * board system, facilitating administrative oversight and moderator roster
   * management.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardModerator.ISummary[];
  };
}
