import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAppealAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_appealsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        resolution: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter: {
          select: {
            id: true,
          },
        },
        target: {
          select: {
            id: true,
          },
        },
        moderator: {
          select: {
            id: true,
          },
        },
        discussion_board_notification_records: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_appealsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAppeal.ISummary> {
    return {
      id: input.id,
      status: input.status as "pending" | "approved" | "rejected" | "resolved",
      type: input.reason as
        | "content_removal"
        | "user_suspension"
        | "account_ban",
      reported_content_id: input.target.id,
      created_at: input.created_at.toISOString(),
      resolved_at:
        input.status === "resolved" ? input.updated_at.toISOString() : null,
      moderator_id: input.moderator?.id ?? null,
      priority: input.resolution as "low" | "medium" | "high",
      citizen_id: input.reporter.id,
    };
  }
}
