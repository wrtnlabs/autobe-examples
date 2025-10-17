import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia, { tags } from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { IDiscussionBoardReport } from "../../../../structures/IDiscussionBoardReport";
import { IPageIDiscussionBoardReport } from "../../../../structures/IPageIDiscussionBoardReport";

/**
 * Search and retrieve filtered moderation queue reports with pagination and
 * priority sorting.
 *
 * This operation provides moderators and administrators with comprehensive
 * access to the content moderation queue, enabling efficient review and
 * management of reported content. The moderation queue is the central workflow
 * hub for maintaining community standards and enforcing guidelines for civil
 * discourse on economic and political topics.
 *
 * The operation supports sophisticated filtering capabilities essential for
 * effective moderation queue management. Moderators can filter reports by
 * current status (pending for unassigned reports, under_review for reports
 * actively being investigated, resolved for completed reviews, or dismissed for
 * reports determined to be without merit). Violation category filtering allows
 * moderators to focus on specific types of guideline violations such as
 * personal attacks, hate speech, misinformation, spam, offensive language,
 * off-topic content, threats, doxxing, or trolling. Severity level filtering
 * (critical, high, medium, low) enables prioritization of the most serious
 * violations requiring immediate attention. Additional filters include assigned
 * moderator (to view reports assigned to specific team members or unassigned
 * reports), date range for investigating reports from specific time periods,
 * and report count (number of times the same content has been reported by
 * different users, indicating community consensus on violations).
 *
 * The default sorting algorithm prioritizes reports using a composite score
 * that considers severity level (critical violations appear first), multiple
 * reports on the same content (community agreement elevates priority), and time
 * in queue (older unresolved reports gradually increase in priority to ensure
 * timely review). Alternative sorting options allow moderators to view the
 * queue chronologically (oldest unresolved first, newest first), by severity
 * only, or by report count. This flexible sorting ensures moderators can work
 * through the queue efficiently while ensuring critical violations receive
 * immediate attention.
 *
 * Pagination controls enable moderators to navigate large moderation queues
 * effectively. The operation returns comprehensive report information for each
 * queue item including report ID, submission timestamp, content preview (first
 * 100 characters of reported content), violation category and severity, number
 * of reports on this content, current status, assigned moderator (if any), and
 * time in queue. This information enables moderators to quickly assess reports
 * and prioritize their review workflow.
 *
 * Security and permission enforcement are critical for this operation. Only
 * users with moderator or administrator roles can access the moderation queue.
 * Regular members cannot view reports or access moderation interfaces. When a
 * moderator accesses the queue, they see all pending and under-review reports
 * across the platform. Administrators have unrestricted access to the complete
 * queue including resolved and dismissed reports for audit and oversight
 * purposes. The operation respects role-based access control defined in the
 * User Roles and Authentication requirements.
 *
 * The operation integrates with multiple moderation workflow components. Report
 * data references the discussion_board_reports table which contains foreign
 * keys to reported content (discussion_board_topics or
 * discussion_board_replies), the reporting user (discussion_board_members), and
 * the assigned moderator (discussion_board_moderators). The operation provides
 * the foundation for subsequent moderation actions including content review,
 * warning issuance, content hiding or removal, user suspension, and report
 * resolution. All data returned respects soft delete patterns, excluding
 * reports with deleted_at timestamps unless explicitly requested by
 * administrators for audit purposes.
 *
 * Performance requirements mandate that the moderation queue loads within 2
 * seconds even with thousands of pending reports. Efficient database indexing
 * on status, severity, assigned moderator, and creation timestamp columns
 * supports rapid filtering and sorting. The operation uses pagination to limit
 * result set sizes, preventing performance degradation as the report volume
 * grows. Real-time updates are not required for this operation; moderators can
 * refresh the queue manually to see newly submitted reports.
 *
 * The operation supports the platform's commitment to transparent, fair, and
 * timely content moderation. By providing powerful filtering and sorting tools,
 * the system enables moderators to work through the queue efficiently, address
 * critical violations immediately, and maintain consistent response times. The
 * comprehensive report information displayed supports informed moderation
 * decisions while the audit trail (created through subsequent moderation action
 * operations) ensures accountability for all moderation activities.
 *
 * @param props.connection
 * @param props.body Search criteria, filters, pagination parameters, and
 *   sorting options for moderation queue reports
 * @path /discussionBoard/administrator/reports
 * @accessor api.functional.discussionBoard.administrator.reports.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Search criteria, filters, pagination parameters, and sorting options
     * for moderation queue reports
     */
    body: IDiscussionBoardReport.IRequest;
  };
  export type Body = IDiscussionBoardReport.IRequest;
  export type Response = IPageIDiscussionBoardReport.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/discussionBoard/administrator/reports",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/discussionBoard/administrator/reports";
  export const random = (): IPageIDiscussionBoardReport.ISummary =>
    typia.random<IPageIDiscussionBoardReport.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve detailed information about a specific content report.
 *
 * Retrieve comprehensive information about a specific content report in the
 * moderation system. This operation provides complete details of content
 * reports submitted by members to flag topics or replies that violate community
 * guidelines on the economic and political discussion board.
 *
 * This endpoint is critical for the moderation workflow, allowing
 * administrators to examine individual reports in detail for quality assurance
 * oversight, appeals processing, and comprehensive moderation review. The
 * returned data includes all information necessary to evaluate the violation,
 * understand the context, and review moderation decisions.
 *
 * The operation retrieves data from the discussion_board_reports table as
 * defined in the Prisma schema, incorporating all report fields including
 * reporter information, reported content references, violation categorization,
 * severity level, current status, assigned moderator, and resolution details.
 * The response includes relationships to the reporter member, reported topic or
 * reply, and assigned moderator for comprehensive context.
 *
 * Security considerations include role-based access control ensuring only
 * administrators can access this administrative endpoint. The endpoint
 * validates that the requesting user has administrator privileges before
 * returning sensitive moderation information. Reports contain information about
 * community members and potentially offensive content, requiring strict access
 * control limited to administrative staff.
 *
 * This operation integrates with the moderation oversight workflow where
 * administrators review moderator decisions, handle appeals, and ensure
 * consistent application of community guidelines. Administrators use this
 * endpoint to examine report details when users appeal moderation decisions, to
 * audit moderator performance, and to investigate complex or borderline
 * violation cases.
 *
 * Expected usage patterns include administrators reviewing reports during
 * appeal processes, conducting quality assurance on moderation decisions,
 * investigating patterns of reports against specific users or content types,
 * and supporting the transparent, accountable moderation system defined in
 * platform requirements for maintaining civil discourse on economic and
 * political topics.
 *
 * @param props.connection
 * @param props.reportId Unique identifier of the content report to retrieve
 * @path /discussionBoard/administrator/reports/:reportId
 * @accessor api.functional.discussionBoard.administrator.reports.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /** Unique identifier of the content report to retrieve */
    reportId: string & tags.Format<"uuid">;
  };
  export type Response = IDiscussionBoardReport;

  export const METADATA = {
    method: "GET",
    path: "/discussionBoard/administrator/reports/:reportId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/discussionBoard/administrator/reports/${encodeURIComponent(props.reportId ?? "null")}`;
  export const random = (): IDiscussionBoardReport =>
    typia.random<IDiscussionBoardReport>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("reportId")(() => typia.assert(props.reportId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Update an existing content report with review status, assignment, or
 * resolution details.
 *
 * Update an existing content report's details including status, moderator
 * assignment, resolution notes, and dismissal reasons. This operation is used
 * throughout the moderation workflow when moderators claim reports by assigning
 * themselves, progress reports from pending to under_review status, resolve
 * reports by adding resolution notes and marking them resolved, or dismiss
 * false reports with explanatory dismissal reasons.
 *
 * This operation directly modifies the discussion_board_reports table in the
 * Prisma schema. The report being updated is identified by the reportId path
 * parameter which corresponds to the discussion_board_reports.id field.
 * Moderators can update the assigned_moderator_id to claim reports, change the
 * status field through the workflow states (pending, under_review, resolved,
 * dismissed), add resolution_notes explaining their decision, and provide
 * dismissal_reason if the report is determined to be invalid.
 *
 * Security considerations require that only users with moderator or
 * administrator roles can update reports. The system validates that the report
 * exists before allowing updates, prevents status transitions that violate
 * workflow logic (e.g., cannot go from resolved back to pending), and ensures
 * resolution_notes or dismissal_reason are provided when required by the new
 * status. All updates are logged in the moderation audit trail per the
 * requirements.
 *
 * This operation is typically used after moderators access the moderation queue
 * (via PATCH /moderationActions) to retrieve pending reports, then update
 * individual reports as they review content. Related operations include GET
 * /reports/{reportId} to view full report details, and the moderation action
 * creation flow that references the updated report.
 *
 * @param props.connection
 * @param props.reportId Unique identifier of the content report to update
 * @param props.body Updated report information including status, assignment,
 *   and resolution details
 * @path /discussionBoard/administrator/reports/:reportId
 * @accessor api.functional.discussionBoard.administrator.reports.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /** Unique identifier of the content report to update */
    reportId: string & tags.Format<"uuid">;

    /**
     * Updated report information including status, assignment, and
     * resolution details
     */
    body: IDiscussionBoardReport.IUpdate;
  };
  export type Body = IDiscussionBoardReport.IUpdate;
  export type Response = IDiscussionBoardReport;

  export const METADATA = {
    method: "PUT",
    path: "/discussionBoard/administrator/reports/:reportId",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/discussionBoard/administrator/reports/${encodeURIComponent(props.reportId ?? "null")}`;
  export const random = (): IDiscussionBoardReport =>
    typia.random<IDiscussionBoardReport>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("reportId")(() => typia.assert(props.reportId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
