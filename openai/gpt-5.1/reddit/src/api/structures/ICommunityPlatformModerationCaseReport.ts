import { tags } from "typia";

import { ICommunityPlatformModerationCase } from "./ICommunityPlatformModerationCase";
import { ICommunityPlatformMemberuser } from "./ICommunityPlatformMemberuser";

export namespace ICommunityPlatformModerationCaseReport {
  /**
   * Search and filter criteria for retrieving reports associated with a
   * specific moderation case identified by its caseKey.
   *
   * This DTO is used in adminUser tooling to perform rich queries over the
   * reports that have been aggregated into a moderation case. It supports
   * filtering by report type, status, severity, reporter, and time ranges, as
   * well as pagination and sorting.
   */
  export type IRequest = {
    /**
     * 1-based page index for pagination of moderation case reports.
     *
     * If omitted, the backend should default to the first page.
     */
    page?: (number & tags.Type<"int32">) | undefined;

    /**
     * Maximum number of report records to return in a single page.
     *
     * The backend should enforce an upper bound to protect performance even
     * if larger values are supplied.
     */
    limit?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional filter by report type.
     *
     * Typical values include "post", "comment", "community", and "user" to
     * reflect whether the report targets a post, comment, entire community,
     * or a specific user account.
     */
    reportType?: string | undefined;

    /**
     * Optional filter by the current handling status of individual reports
     * associated with the case.
     *
     * Examples include values like "open", "triaged", "resolved", or
     * "dismissed", depending on the business-level enum defined in the
     * Prisma schema.
     */
    status?: string | undefined;

    /**
     * Optional filter by the severity or priority classification of the
     * reports.
     *
     * Usually corresponds to the same or similar enum as the case severity,
     * such as "low", "medium", "high", or "critical".
     */
    severity?: string | undefined;

    /**
     * Optional filter restricting the result set to reports submitted by a
     * specific member user, identified by their business key or handle.
     *
     * Useful when investigating patterns of abuse or validating the
     * behavior of particular reporters.
     */
    reporterMemberUserKey?: string | undefined;

    /**
     * Start of the creation time range filter for reports.
     *
     * Only reports created at or after this timestamp are included in the
     * result set.
     */
    createdFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End of the creation time range filter for reports.
     *
     * Only reports created at or before this timestamp are included in the
     * result set.
     */
    createdTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Sorting key for the report search results.
     *
     * Common values include "createdAt", "severity", or "status"; the
     * backend should validate and default to a safe ordering if an
     * unsupported field is provided.
     */
    orderBy?: string | undefined;

    /**
     * Sort direction for the ordered report list.
     *
     * Typical values are "asc" for ascending and "desc" for descending
     * order.
     */
    orderDirection?: string | undefined;
  };

  /**
   * Summary view of an individual report that is associated with a moderation
   * case.
   *
   * This DTO is optimized for list and table views used by moderators when
   * inspecting moderation cases. It provides enough context to quickly
   * understand which case the report belongs to, who submitted it, the
   * high-level report type, and what kind of target was reported, without
   * loading the full report body or detailed evidence payloads.
   *
   * By embedding summary views for the owning moderation case and the
   * reporting member user, this schema supports atomic read operations for
   * common moderation dashboards and queues, avoiding extra per-row lookups
   * for case and reporter metadata.
   */
  export type ISummary = {
    /**
     * Unique identifier of the individual report that participates in a
     * moderation case.
     *
     * This value corresponds to the primary key of the underlying report
     * record in the persistence layer and is used for deep linking into
     * detail views or for follow‑up moderation actions.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Moderation case that this report is attached to, represented in
     * summary form.
     *
     * This object provides high‑level case context such as case key, title,
     * status, and priority, enabling moderators to understand how this
     * report fits into the broader moderation workflow without an
     * additional lookup call.
     */
    moderation_case: ICommunityPlatformModerationCase.ISummary;

    /**
     * Member user who submitted this report, represented as a summary.
     *
     * This relation exposes minimal identity information about the
     * reporting user so that moderators can see who escalated the issue,
     * correlate repeated reporters, and reason about potential abuse of the
     * reporting feature.
     */
    reporter: ICommunityPlatformMemberuser.ISummary;

    /**
     * High-level classification of the report, such as spam, harassment,
     * copyright, or other policy categories.
     *
     * The exact set of values is defined by moderation policy configuration
     * and is used for triage, prioritization, and analytics rather than for
     * low‑level technical filtering.
     */
    report_type: string;

    /**
     * Type of entity that was reported, such as `post`, `comment`,
     * `community`, or `user`.
     *
     * This value describes the high‑level target category for the report
     * and is used by moderation tools to route reviewers to the correct
     * detail views and apply appropriate policy checks.
     */
    target_type: string;

    /**
     * Timestamp indicating when this report was created by the reporting
     * user.
     *
     * Stored as an ISO‑8601 date‑time string in UTC, this value is used for
     * chronological sorting, SLA calculations, and determining staleness of
     * unresolved reports.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
