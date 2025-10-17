import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { IDiscussionBoardReport } from "../../../structures/IDiscussionBoardReport";
import { IPageIDiscussionBoardReport } from "../../../structures/IPageIDiscussionBoardReport";

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
 * @path /discussionBoard/reports
 * @accessor api.functional.discussionBoard.reports.index
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
    path: "/discussionBoard/reports",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/discussionBoard/reports";
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
