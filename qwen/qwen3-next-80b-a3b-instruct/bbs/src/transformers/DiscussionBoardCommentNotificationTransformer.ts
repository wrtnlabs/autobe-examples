import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCommentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentNotification";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentNotificationTransformer {
  export type Payload = Prisma.discussion_board_comment_notificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        type: true,
        metadata: true,
        created_at: true,
        recipient: {
          select: {
            id: true,
          },
        },
        triggerComment: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_comment_notificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentNotification> {
    return {
      id: input.id,
      comment_id: input.triggerComment.id,
      recipient_id: input.recipient.id,
      type: input.type as "reply" | "report" | "upvote" | "downvote",
      is_read: false, // Hardcoded default: all notifications are unread by default
      created_at: input.created_at.toISOString(),
    };
  }
}
