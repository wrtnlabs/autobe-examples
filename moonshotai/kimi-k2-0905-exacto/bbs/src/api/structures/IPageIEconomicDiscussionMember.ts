import { IPage } from "./IPage";
import { IEconomicDiscussionMember } from "./IEconomicDiscussionMember";

export namespace IPageIEconomicDiscussionMember {
  /**
   * Paginated response containing Economic Discussion community member
   * summaries for administrative browsing and management.
   *
   * This wrapper provides structured pagination information alongside
   * filtered member data, enabling efficient browsing of large member bases
   * through administrative interfaces. The response format supports complex
   * search operations with proper pagination controls for community
   * management workflows.
   *
   * The pagination structure ensures administrators can navigate extensive
   * member databases systematically while maintaining performance through
   * controlled result set sizes. Member summaries provide sufficient
   * information for identification and basic administrative tasks without
   * exposing sensitive account details.
   */
  export type ISummary = {
    /**
     * Comprehensive pagination metadata for browsing through large member
     * bases in administrative interfaces. Includes current page position,
     * total pages available, records per page limit, and total record count
     * for complete pagination context.
     */
    pagination: IPage.IPagination;

    /**
     * Array of community member summaries matching the search and filtering
     * criteria. Each member summary includes essential identification
     * information (ID, username, email) for administrative review and
     * cross-referencing purposes without exposing sensitive profile details
     * or authentication data.
     */
    data: IEconomicDiscussionMember.ISummary[];
  };
}
