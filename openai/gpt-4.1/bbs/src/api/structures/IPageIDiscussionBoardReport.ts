import { IPage } from "./IPage";
import { IDiscussionBoardReport } from "./IDiscussionBoardReport";

export namespace IPageIDiscussionBoardReport {
  /**
   * Paginated list structure for moderation report summaries in the
   * discussion board platform.
   *
   * This schema is returned by API endpoints providing administrators and
   * moderators with filtered and paginated sets of user-submitted moderation
   * reports. Each page delivers both full pagination metadata (used for
   * client navigation and analytics) and a sequence of summarized moderation
   * reports, including identity of the reporter, context of the flagged
   * entity, and status metadata for workflow management.
   *
   * It is essential for moderation workflows, supporting efficient audit,
   * triage, and compliance review of reported content. The schema's structure
   * keeps separation of report summary and pagination consistent across all
   * admin reporting interfaces, allowing for audit integration and scalable
   * moderation at scale. Its purpose is to standardize paginated report
   * delivery for administrative and audit clients in highly regulated online
   * community contexts.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardReport.ISummary[];
  };
}
