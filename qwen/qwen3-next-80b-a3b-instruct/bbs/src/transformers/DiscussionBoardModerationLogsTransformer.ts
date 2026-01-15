import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLogs";
import { IDiscussionBoardModerationLogDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLogDetails";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardModerationLogsTransformer {
  export type Payload = Prisma.discussion_board_moderation_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        moderator: true,
        action_type: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        targetRecord: true,
      },
    } satisfies Prisma.discussion_board_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModerationLogs> {
    return {
      id: input.id,
      moderator_id: input.moderator.id,
      action_type: input.action_type as "dismiss" | "remove" | "warn",
      target_content_id: input.targetRecord.id,
      target_content_type: "article", // Based on schema: targetRecord is always an article
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      ip_address: undefined, // Field does not exist in schema
      user_agent: undefined, // Field does not exist in schema
      details: undefined, // Field does not exist in schema
    };
  }
}
