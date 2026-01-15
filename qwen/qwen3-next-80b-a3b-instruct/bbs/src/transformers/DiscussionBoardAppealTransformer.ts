import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAppealTransformer {
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
  ): Promise<IDiscussionBoardAppeal> {
    return {
      id: input.id,
      appeal_reason: input.reason,
      status: input.status as
        | "pending"
        | "rejected"
        | "approved"
        | "in-progress",
      created_at: input.created_at.toISOString(),
      moderation_action_id: input.reporter.id,
      target_content_id: input.target.id,
    };
  }
}
