import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardNotificationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationRecord";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardNotificationRecordTransformer {
  export type Payload = Prisma.discussion_board_notification_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        notification_type: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        is_read: true,
        recipient: {
          select: {
            id: true,
          },
        },
        targetPost: {
          select: {
            id: true,
          },
        },
        targetComment: {
          select: {
            id: true,
          },
        },
        targetReport: {
          select: {
            id: true,
          },
        },
        targetModerationAction: {
          select: {
            id: true,
          },
        },
        targetAppeal: {
          select: {
            id: true,
          },
        },
        discussion_board_notification_delivery_logs: {
          select: {
            id: true,
          },
        },
        discussion_board_notification_read_status: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_notification_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardNotificationRecord> {
    let metadata: Record<string, any> = {};
    if (input.metadata && typeof input.metadata === "string") {
      try {
        metadata = JSON.parse(input.metadata);
      } catch (e) {
        // Silently ignore malformed JSON
      }
    }
    return {
      id: input.id,
      recipient_id: input.recipient.id,
      type: input.notification_type,
      title: metadata.title ?? "Untitled Notification",
      content: metadata.content ?? "No content available",
      target_object_id:
        input.targetPost?.id ??
        input.targetComment?.id ??
        input.targetReport?.id ??
        input.targetModerationAction?.id ??
        input.targetAppeal?.id ??
        undefined,
      target_object_type: input.targetPost
        ? "post"
        : input.targetComment
          ? "comment"
          : input.targetReport
            ? "report"
            : input.targetModerationAction
              ? "moderation_action"
              : input.targetAppeal
                ? "appeal"
                : undefined,
      read_at: input.is_read
        ? input.updated_at.toISOString()
        : new Date("2300-01-01").toISOString(),
      created_at: input.created_at.toISOString(),
    };
  }
}
