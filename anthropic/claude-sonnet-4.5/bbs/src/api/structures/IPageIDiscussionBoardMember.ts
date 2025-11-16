import { IPage } from "./IPage";
import { IDiscussionBoardMember } from "./IDiscussionBoardMember";

export namespace IPageIDiscussionBoardMember {
  /**
   * Paginated collection of discussion board member summaries.
   *
   * This pagination wrapper provides a standardized structure for returning
   * paginated lists of discussion board members. It combines the member data
   * array with comprehensive pagination metadata to support efficient
   * navigation through large member datasets.
   *
   * Primarily used in moderator and administrator interfaces where member
   * management requires browsing through potentially large member lists with
   * search, filter, and sort capabilities. The pagination information enables
   * clients to implement proper page navigation controls and display total
   * record counts.
   *
   * The data array contains lightweight member summary DTOs optimized for
   * list displays, showing only essential identification information. Full
   * member details can be retrieved by following up with individual member
   * detail requests using the member IDs from the summaries.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating the member list.
     *
     * This property contains comprehensive pagination information including
     * the current page number, page size limit, total record count, and
     * total page count. The metadata structure follows the
     * IPage.IPagination schema standard used across all paginated responses
     * in the system.
     *
     * Clients use this pagination data to build navigation controls
     * (first/previous/next/last page buttons), display result summaries
     * ("Showing 11-20 of 47 members"), and determine whether additional
     * pages exist beyond the current view. The metadata enables proper
     * pagination state management in user interfaces.
     *
     * The pagination object calculates the total pages based on the
     * configured page size and total matching records, ensuring clients
     * have complete information for implementing efficient member list
     * browsing in administrative and moderation contexts.
     */
    pagination: IPage.IPagination;

    /**
     * Array of member summary records for the current page.
     *
     * Contains the actual member data for this page of results, with each
     * element being a lightweight IDiscussionBoardMember.ISummary object
     * optimized for list display contexts. The array length will not exceed
     * the pagination limit specified in the request, and may be shorter on
     * the final page or when fewer records match the query criteria.
     *
     * Each member summary includes essential identification fields (id,
     * username, email), account status information, verification state, and
     * registration timestamp. This curated field set provides sufficient
     * information for rendering member lists in administrative interfaces
     * while excluding sensitive authentication details and verbose profile
     * data.
     *
     * Clients render this array to display the member list, typically in a
     * table or card layout showing username, status badges, registration
     * dates, and action buttons. For complete member details including all
     * database fields and relationships, clients can fetch individual
     * members using the id from these summaries via dedicated member detail
     * endpoints.
     *
     * When the search/filter criteria match no members, this array will be
     * empty while the pagination metadata will indicate 0 total records and
     * 0 total pages.
     */
    data: IDiscussionBoardMember.ISummary[];
  };
}
