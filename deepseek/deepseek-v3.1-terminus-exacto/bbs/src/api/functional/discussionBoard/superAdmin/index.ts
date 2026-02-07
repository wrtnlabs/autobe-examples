import { HttpError, IConnection } from "@nestia/fetcher";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia, { tags } from "typia";

import { IDiscussionBoardAdministratorPromotionApproval } from "../../../structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardAdministratorPromotionRequest } from "../../../structures/IDiscussionBoardAdministratorPromotionRequest";

export * as system_configurations from "./system_configurations/index";
export * as audit_logs from "./audit_logs/index";
export * as content_moderation_logs from "./content_moderation_logs/index";
export * as system_activities from "./system_activities/index";
export * as performance_metrics from "./performance_metrics/index";
export * as error_logs from "./error_logs/index";
export * as backup_records from "./backup_records/index";
export * as maintenance_schedules from "./maintenance_schedules/index";
export * as api_rate_limits from "./api_rate_limits/index";
export * as security_events from "./security_events/index";
export * as data_retention_policies from "./data_retention_policies/index";
export * as promotion_approvals from "./promotion_approvals/index";
export * as sections from "./sections/index";
export * as articles from "./articles/index";
export * as comment_rate_limits from "./comment_rate_limits/index";
export * as comments from "./comments/index";
export * as promotion_requests from "./promotion_requests/index";
export * as administrators from "./administrators/index";
export * as bans from "./bans/index";
export * as ban_records from "./ban_records/index";
export * as moderation_logs from "./moderation_logs/index";
export * as content_flags from "./content_flags/index";
export * as moderated_content_histories from "./moderated_content_histories/index";
export * as administrator_grade_changes from "./administrator_grade_changes/index";
export * as ban_reason_categories from "./ban_reason_categories/index";
export * as ban_durations from "./ban_durations/index";
export * as moderation_action_types from "./moderation_action_types/index";
export * as users from "./users/index";
export * as system from "./system/index";
export * as statistics from "./statistics/index";
export * as orders from "./orders/index";
export * as analytics from "./analytics/index";
export * as dashboard from "./dashboard/index";
export * as moderation_queue from "./moderation_queue/index";
export * as capabilities from "./capabilities/index";
export * as moderation_queues from "./moderation_queues/index";

/**
 * Process an administrator promotion request review by approving or rejecting the request via creation of approval records.
 *
 * This operation enables super administrators to review and decide on administrator promotion requests submitted by regular users. The review process involves evaluating the user's justification for seeking administrator status and making an informed decision based on platform governance policies.
 *
 * When a promotion request is approved, the system creates an approval record linking to the promotion request and creates an administrator assignment for the user. Approved administrators gain privileges for content moderation, section management, and user banning capabilities while maintaining accountability through audit trails.
 *
 * When a promotion request is rejected, the system creates a rejection record maintaining the decision details for compliance tracking. Rejected requests preserve records for future reference while the user remains a regular user.
 *
 * The operation ensures proper audit trail maintenance by recording the reviewing administrator's identity, decision timestamp, and rationale in the approval records table. All review activities are logged for transparency and accountability in the administrator promotion process.
 *
 * Security considerations require that only super administrators can access this operation, with proper authentication and authorization checks. The system validates that the promotion request exists and is in a pending state before processing the review.
 *
 * @param props.connection
 * @param props.requestId Unique identifier of the promotion request to review
 * @param props.body Review decision and optional notes for the promotion request
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor superAdmin
 * @x-autobe-specification Validate that the requesting user is authenticated as a super administrator with appropriate privileges. Check that the promotion request exists and has a status of 'pending'. Process the review decision by updating the promotion request status to 'approved' or 'rejected' based on the request body. If approved, create an administrator assignment record for the user and update their privileges. If rejected, maintain the request record with rejection details. Update timestamps and record the reviewing administrator's identity. Return the updated promotion request details with complete audit information.
 * @path /discussionBoard/superAdmin/:requestId/review
 * @accessor api.functional.discussionBoard.superAdmin.review
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function review(
  connection: IConnection,
  props: review.Props,
): Promise<review.Response> {
  return true === connection.simulate
    ? review.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...review.METADATA,
          path: review.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace review {
  export type Props = {
    /**
     * Unique identifier of the promotion request to review
     */
    requestId: string & tags.Format<"uuid">;

    /**
     * Review decision and optional notes for the promotion request
     */
    body: IDiscussionBoardAdministratorPromotionRequest.IReview;
  };
  export type Body = IDiscussionBoardAdministratorPromotionRequest.IReview;
  export type Response = IDiscussionBoardAdministratorPromotionRequest;

  export const METADATA = {
    method: "PATCH",
    path: "/discussionBoard/superAdmin/:requestId/review",
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
    `/discussionBoard/superAdmin/${encodeURIComponent(props.requestId ?? "null")}/review`;
  export const random = (): IDiscussionBoardAdministratorPromotionRequest =>
    typia.random<IDiscussionBoardAdministratorPromotionRequest>();
  export const simulate = (
    connection: IConnection,
    props: review.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: review.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("requestId")(() => typia.assert(props.requestId));
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
 * Promote a regular administrator to super administrator status.
 *
 * This administrative operation elevates a regular administrator's privileges to the highest level in the system, granting them additional capabilities including the ability to promote other administrators and manage system-wide settings. The operation requires the requesting user to be a super administrator and validates that the target administrator is currently at the regular grade level.
 *
 * The promotion process updates the administrator's grade field in the discussion_board_administrators table and creates an audit trail entry in the discussion_board_administrator_grade_changes table. This ensures proper tracking of all grade transitions within the administrator hierarchy system. Super administrators cannot demote themselves through this operation, maintaining system integrity.
 *
 * This operation is part of the comprehensive administrator management system that supports the hierarchical governance structure. After promotion, the administrator gains access to all super administrator capabilities including promotion request review, administrator grade management, and system-wide configuration access.
 *
 * @param props.connection
 * @param props.administratorId The unique identifier of the regular administrator to be promoted
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor superAdmin
 * @x-autobe-specification Verify the requesting user is a super administrator with proper authorization. Validate that the target administrator exists and is currently a regular administrator (not already a super admin). Update the administrator's grade from 'regular' to 'super' in the discussion_board_administrators table. Create a grade change record in discussion_board_administrator_grade_changes with the promotion details. Update the admin_id and super_admin_id references appropriately. Return the updated administrator information including the new grade level. Ensure the operation cannot demote the current user (self-demotion prevention).
 * @path /discussionBoard/superAdmin/:administratorId/promote
 * @accessor api.functional.discussionBoard.superAdmin.promote
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function promote(
  connection: IConnection,
  props: promote.Props,
): Promise<promote.Response> {
  return true === connection.simulate
    ? promote.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...promote.METADATA,
          path: promote.path(props),
          status: null,
        },
      );
}
export namespace promote {
  export type Props = {
    /**
     * The unique identifier of the regular administrator to be promoted
     */
    administratorId: string & tags.Format<"uuid">;
  };
  export type Response = IDiscussionBoardAdministratorPromotionApproval;

  export const METADATA = {
    method: "PATCH",
    path: "/discussionBoard/superAdmin/:administratorId/promote",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/discussionBoard/superAdmin/${encodeURIComponent(props.administratorId ?? "null")}/promote`;
  export const random = (): IDiscussionBoardAdministratorPromotionApproval =>
    typia.random<IDiscussionBoardAdministratorPromotionApproval>();
  export const simulate = (
    connection: IConnection,
    props: promote.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: promote.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("administratorId")(() =>
        typia.assert(props.administratorId),
      );
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
 * This operation allows a super administrator to demote another super administrator to regular administrator grade.
 *
 * The demotion process maintains comprehensive audit trails by recording the grade change in the administrator grade changes table. This ensures accountability and transparency in administrator management operations.
 *
 * Only super administrators can perform this operation, and they cannot demote themselves as a system protection measure. The operation requires a reason for the demotion to document the decision-making process.
 *
 * After successful demotion, the affected administrator loses super administrator privileges but retains regular administrator capabilities. The operation preserves all existing administrator assignments and relationships while updating the grade level.
 *
 * This operation is part of the hierarchical administrator management system that supports platform governance and security by enabling controlled privilege escalation and de-escalation processes.
 *
 * @param props.connection
 * @param props.administratorId Unique identifier of the administrator to be demoted
 * @param props.body Demotion reason and confirmation details
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor superAdmin
 * @x-autobe-specification Validate that the requesting user is a super administrator. Verify the target administrator exists and is currently a super administrator. Ensure the requesting administrator is not attempting to demote themselves. Create a grade change record in discussion_board_administrator_grade_changes table with old grade 'super', new grade 'regular', and the provided reason. Update the target administrator's grade to 'regular' in discussion_board_administrators table. Update the grade_changed_at timestamp. Return the updated administrator record.
 * @path /discussionBoard/superAdmin/:administratorId/demote
 * @accessor api.functional.discussionBoard.superAdmin.demote
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function demote(
  connection: IConnection,
  props: demote.Props,
): Promise<demote.Response> {
  return true === connection.simulate
    ? demote.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...demote.METADATA,
          path: demote.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace demote {
  export type Props = {
    /**
     * Unique identifier of the administrator to be demoted
     */
    administratorId: string & tags.Format<"uuid">;

    /**
     * Demotion reason and confirmation details
     */
    body: IDiscussionBoardAdministratorPromotionApproval.IDemote;
  };
  export type Body = IDiscussionBoardAdministratorPromotionApproval.IDemote;
  export type Response = IDiscussionBoardAdministratorPromotionApproval;

  export const METADATA = {
    method: "PATCH",
    path: "/discussionBoard/superAdmin/:administratorId/demote",
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
    `/discussionBoard/superAdmin/${encodeURIComponent(props.administratorId ?? "null")}/demote`;
  export const random = (): IDiscussionBoardAdministratorPromotionApproval =>
    typia.random<IDiscussionBoardAdministratorPromotionApproval>();
  export const simulate = (
    connection: IConnection,
    props: demote.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: demote.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("administratorId")(() =>
        typia.assert(props.administratorId),
      );
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
