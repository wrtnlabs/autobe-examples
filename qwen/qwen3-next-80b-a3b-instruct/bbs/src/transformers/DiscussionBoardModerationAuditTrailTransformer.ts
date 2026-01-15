import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModerationAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAuditTrail";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardModerationAuditTrailTransformer {
  export type Payload =
    Prisma.discussion_board_moderation_audit_trailsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        content_type: true,
        content_id: true,
        original_title: true,
        original_body: true,
        created_at: true,
        deleted_at: true,
        original_metadata: true,
        reason_for_modification: true,
        moderationAction: {
          select: {
            id: true,
          },
        },
        post: {
          select: {
            id: true,
          },
        },
        comment: {
          select: {
            id: true,
          },
        },
        report: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_moderation_audit_trailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModerationAuditTrail> {
    return {
      id: input.id,
      action: input.moderationAction as
        | "dismiss"
        | "remove"
        | "warn"
        | "suspend"
        | "ban",
      target_content_type: input.content_type satisfies string as
        | "article"
        | "comment"
        | "user"
        | "report",
      target_content_id: input.content_id,
      moderator_id: input.moderationAction.id,
      reason: input.reason_for_modification,
      created_at: toISOStringSafe(input.created_at),
      is_active: undefined,
      action_duration_days: undefined,
      resolved: undefined,
      appeal_id: undefined,
      reviewed: undefined,
      reviewer_id: undefined,
      review_notes: undefined,
    };
  }
}
