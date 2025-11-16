import { IPage } from "./IPage";
import { IDiscussionBoardAdminSession } from "./IDiscussionBoardAdminSession";

export namespace IPageIDiscussionBoardAdminSession {
  /**
   * Paginated result set of administrative session summary records.
   *
   * This schema is used for endpoints providing audit, oversight, and search
   * capabilities over administrator login sessions. Each item in the data
   * array summarizes an individual session with relevant metadata for
   * tracking, moderation, and compliance.
   *
   * Essential for displaying session logs in audit dashboards and for
   * supporting operational security reviews or multi-device session analysis
   * by platform administrators. Each paged result includes standard
   * pagination metadata alongside session-level summary information for
   * transparent administrative activity tracking.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardAdminSession.ISummary[];
  };
}
