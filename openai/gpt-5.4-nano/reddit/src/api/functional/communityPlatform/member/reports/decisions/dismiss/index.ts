import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

/**
 * Dismiss a submitted moderation report for a specific report.
 *
 * This operation represents the moderator workflow choice where a community moderator decides to **dismiss** a report. Dismissal keeps the reported post or comment available in the community as normal content, and the dismissed report is no longer shown as an active/pending item for further moderation decisions.
 *
 * Authorization is strict: the caller must be a moderator assigned to the same community that owns the report. If the caller is not authorized, the system denies the action and does not change the report state or the visibility of the reported content.
 *
 * Behavioral rules are driven by the moderation state flow:
 * - Approving a report results in deletion of the reported content.
 * - Dismissing a report results in keeping the reported content and removing the dismissed report from the active report list.
 *
 * Related behavior:
 * - Moderator-facing report list endpoints must exclude dismissed reports, based on whether a resolution exists for the report.
 * - The system must preserve the moderation audit context by associating the resolution with the deciding moderator and the resolved timestamp according to the underlying data model.
 *
 * Expected errors include: forbidden/permission denied for non-moderators, invalid-state/conflict if the report is already resolved in a way that contradicts dismissal, and validation errors if the request payload violates the DTO rules.
 *
 * @param props.connection
 * @param props.reportId Unique identifier of the moderation report to dismiss.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps for Realize Agent:
 *
 * 1) Extract identifiers
 * - Read `reportId` from path parameters.
 *
 * 2) Load report
 * - Query `community_platform_reports` by `id` = reportId.
 * - If not found, return a not-found error.
 *
 * 3) Authorization (moderator of the report’s community)
 * - Determine `community_id` from the loaded report.
 * - Verify the requester is an assigned moderator in `community_platform_community_moderators` where `community_id` = report.community_id and `moderator_user_id` = requester member id.
 * - If not authorized, return a forbidden/permission denied error and do not proceed.
 *
 * 4) Ensure idempotent/one-resolution rule
 * - Check whether `community_platform_report_resolutions` already exists for `community_platform_report_id` = reportId.
 * - Because the schema enforces `@@unique([community_platform_report_id])`, attempting a second insert should be prevented in logic.
 * - If resolution already exists:
 *   - If the existing `resolution_decision` is already “dismissed”, either return the existing resolved representation (idempotent) or return an invalid-state error depending on your standard. Prefer idempotent return to avoid client retries changing nothing.
 *   - If the existing decision is “approved” (or any non-dismiss outcome), deny with conflict/invalid-state (no contradictory transitions).
 *
 * 5) Create resolution row
 * - In a transaction, insert into `community_platform_report_resolutions`:
 *   - `community_platform_report_id` = reportId
 *   - `moderated_by_user_id` = requester member id
 *   - `resolution_decision` = "dismissed"
 *   - `moderation_note` = moderation note from request body (if provided; otherwise set to an empty string or null only if the DTO/mapping allows; otherwise require it in DTO)
 *   - `resolved_at` = current timestamp (service time)
 *
 * 6) Do NOT modify reported content
 * - Do not delete or soft-delete any `community_platform_posts` or `community_platform_comments` rows.
 * - The dismiss outcome must keep the targeted content visible.
 *
 * 7) Return a resolved representation
 * - Fetch the report together with (at minimum) its resolution decision and resolution metadata for the response DTO.
 * - For target rendering context, the service may also use `community_platform_report_targets` to provide target_type/target_id (and resolve post/comment details only if the chosen response DTO requires it).
 *
 * 8) Ensure active list behavior is consistent
 * - The moderator report-list endpoints must filter out dismissed reports. This operation does not directly update list membership; instead, list queries rely on existence and/or decision value in `community_platform_report_resolutions`.
 *
 * Edge cases
 * - Concurrent moderation: use transaction isolation to avoid two resolutions being inserted concurrently.
 * - Soft-deleted report rows: if the report has `deleted_at` set, treat it as not found or return a validation error according to platform convention.
 *
 * Database interactions
 * - Reads: community_platform_reports, community_platform_community_moderators, possibly community_platform_report_resolutions.
 * - Writes: community_platform_report_resolutions only.
 *
 * @path /communityPlatform/member/reports/:reportId/decisions/dismiss
 * @accessor api.functional.communityPlatform.member.reports.decisions.dismiss.dismissReportDecision
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function dismissReportDecision(
  connection: IConnection,
  props: dismissReportDecision.Props,
): Promise<void> {
  return true === connection.simulate
    ? dismissReportDecision.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...dismissReportDecision.METADATA,
          path: dismissReportDecision.path(props),
          status: null,
        },
      );
}
export namespace dismissReportDecision {
  export type Props = {
    /**
     * Unique identifier of the moderation report to dismiss.
     */
    reportId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/member/reports/:reportId/decisions/dismiss",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/reports/${encodeURIComponent(props.reportId ?? "null")}/decisions/dismiss`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: dismissReportDecision.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: dismissReportDecision.path(props),
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
