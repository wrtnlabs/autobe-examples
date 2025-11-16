import { IPage } from "./IPage";
import { ICommunityPlatformMemberSession } from "./ICommunityPlatformMemberSession";

export namespace IPageICommunityPlatformMemberSession {
  /**
   * Paginated response containing member session summary records with
   * navigation metadata.
   *
   * This interface represents a paginated collection of member session
   * summaries, returned when retrieving all active sessions for an
   * authenticated member. The response combines session data with pagination
   * information to enable efficient browsing of session lists across multiple
   * devices.
   *
   * Each record in the data array contains essential session metadata
   * including connection details (IP address, referrer, connection URL) and
   * timestamps that help members identify devices and manage their security.
   * The pagination metadata allows clients to navigate through large session
   * lists when members have many active sessions.
   *
   * Use this response type when displaying device management interfaces,
   * session history views, or security dashboards where users can review and
   * manage their active sessions.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformMemberSession.ISummary[];
  };
}
