import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardModerationActionTransformer {
  export type Payload = Prisma.discussion_board_moderation_actionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        action_type: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        target: true, // Only select the relation which will provide target_id
        moderator: true,
        report: true,
        discussion_board_archives: true,
        discussion_board_comment_mod_actions: true,
        discussion_board_moderation_audit_trails: true,
        discussion_board_citizen_violations: true,
        discussion_board_notification_records: true,
      },
    } satisfies Prisma.discussion_board_moderation_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModerationAction> {
    return {
      id: input.id,
      target_type: typia.assert<
        "article" | "comment" | "post" | "user" | "report"
      >(input.target_type),
      target_id: input.target
        ? typia.assert<string & tags.Format<"uuid">>(input.target.id)
        : null,
      action_type: typia.assert<
        | "CONTENT_REMOVAL"
        | "USER_WARNING"
        | "USER_SUSPENSION"
        | "DEACTIVATION"
        | "CONTENT_RESTORE"
        | "CONFLICT_RESOLUTION"
      >(input.action_type),
      reason: input.reason,
      severity_level: 1,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      action_status: "active",
      notes: undefined,
      related_action_id: null,
      tags: undefined,
    };
  }
}
