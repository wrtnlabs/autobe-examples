import { tags } from "typia";

import { IDiscussionBoardReport } from "./IDiscussionBoardReport";
import { IDiscussionBoardMemberuser } from "./IDiscussionBoardMemberuser";

export namespace IDiscussionBoardReportOfMemberUser {
  /**
   * Inverted view of the association between a discussion board report and
   * the member user who submitted it.
   *
   * This DTO is centered on the subsidiary Prisma model
   * `discussion_board_report_of_memberusers`, but it enriches the link with
   * compact representations of both the underlying report and the reporting
   * member user so that moderation tools can render all necessary context in
   * a single response without additional API calls.
   *
   * The schema is designed specifically for admin-facing report handling
   * flows. It intentionally excludes any reverse collections (such as all
   * reports for a member user) to avoid circular references and oversized
   * payloads, while still exposing all identifiers and timestamps required
   * for auditing and workflow transitions.
   */
  export type IInvert = {
    /**
     * Unique identifier of the link entity in
     * `discussion_board_report_of_memberusers`.
     *
     * This value represents the primary key of the association row that
     * connects a single `discussion_board_reports` record to the member
     * user reporter from `discussion_board_memberusers`.
     *
     * Moderation tools and audit logs can rely on this identifier to
     * reference the exact reporter-link instance, even if the underlying
     * report or member user evolves over time.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Identifier of the report in `discussion_board_reports` that this link
     * row refers to.
     *
     * This field matches `discussion_board_reports.id` and allows the
     * system to correlate the reporter association with the main report
     * entity.
     *
     * It is unique per link table by design, reflecting the 1:1
     * relationship between a given report and its member user reporter in
     * this association table.
     */
    discussion_board_report_id: string & tags.Format<"uuid">;

    /**
     * Identifier of the member user account in
     * `discussion_board_memberusers` that submitted the report.
     *
     * This field corresponds to `discussion_board_memberusers.id` and
     * enables joins to retrieve the reporting actor's profile and status.
     *
     * Although the link table enforces a 1:1 relationship at the report
     * level, a single member user may appear in many link rows across
     * different reports.
     */
    discussion_board_memberuser_id: string & tags.Format<"uuid">;

    /**
     * Timestamp when this report-to-memberUser association row was created.
     *
     * This is typically set at the moment the report is filed by the member
     * user and may differ from the main report's timestamps if additional
     * normalization or background processing is performed.
     *
     * The value is primarily used for audit trails and time-based filtering
     * in internal tools.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Compact representation of the underlying report from
     * `discussion_board_reports`.
     *
     * This summary object exposes the key attributes of the report that are
     * relevant for moderation decisions, such as target type, reporter
     * type, reason code, status, action, and timestamps, without including
     * any collections that could create circular references.
     *
     * Including this summary allows admin UIs to render the essential
     * report context directly alongside the reporter information returned
     * by this endpoint.
     */
    report: IDiscussionBoardReport.ISummary;

    /**
     * Summary view of the member user from `discussion_board_memberusers`
     * who filed the report.
     *
     * The summary exposes only public and moderation-relevant fields, such
     * as display name, account status, and basic profile flags, and
     * deliberately excludes sensitive authentication details like email or
     * password hash.
     *
     * By embedding this summary, the API enables moderators to evaluate
     * both the report and the reporter in one response while avoiding
     * reverse collections that would lead to circular structures.
     */
    memberUser: IDiscussionBoardMemberuser.ISummary;
  };
}
