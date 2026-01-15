import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardNotificationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationRecord";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardNotificationRecordAtSummaryTransformer {
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
  ): Promise<IDiscussionBoardNotificationRecord.ISummary> {
    // Extract recipient details from the belongsTo relation
    const recipientId = input.recipient.id;
    const recipientRole = input.recipient.role || "user";
    // Determine related object type and id from the belongsTo relations
    let relatedObjectId: string | null = null;
    let relatedObjectType: IDiscussionBoardNotificationRecord.ISummary["related_object_type"] =
      "system_event";
    if (input.targetPost) {
      relatedObjectId = input.targetPost.id;
      relatedObjectType = "article";
    } else if (input.targetComment) {
      relatedObjectId = input.targetComment.id;
      relatedObjectType = "comment";
    } else if (input.targetReport) {
      relatedObjectId = input.targetReport.id;
      relatedObjectType = "report";
    } else if (input.targetModerationAction) {
      relatedObjectId = input.targetModerationAction.id;
      relatedObjectType = "moderation_action";
    } else if (input.targetAppeal) {
      relatedObjectId = input.targetAppeal.id;
      relatedObjectType = "appeal";
    }
    // Extract metadata properties from the JSON metadata field
    const metadata = input.metadata ?? {};
    const contentSummary = (metadata as any)?.summary ?? "";
    const source = (metadata as any)?.source ?? "system";
    const triggeringAction =
      (metadata as any)?.triggering_action ?? "system_event";
    const priorityLevel = (metadata as any)?.priority_level ?? "normal";
    const notificationCategory =
      (metadata as any)?.notification_category ?? "system_notification";
    const triggeringEvent =
      (metadata as any)?.triggering_event ?? "system_event";
    // Determine status from deleted_at or metadata
    const status = input.deleted_at
      ? "deleted"
      : ((metadata as any)?.status ?? "active");
    // Calculate unread count from the main is_read field (system count)
    const unreadCount = 0; // System maintains global count, not based on this single record
    return {
      id: input.id,
      recipient_id: recipientId,
      recipient_role: recipientRole,
      related_object_id: relatedObjectId
        ? (relatedObjectId satisfies string as string)
        : null,
      related_object_type: relatedObjectType,
      notification_type: typia.assert<
        | "reply"
        | "mention"
        | "report_submitted"
        | "report_accepted"
        | "report_rejected"
        | "moderation_action_applied"
        | "account_suspended"
        | "account_unsuspended"
        | "account_banned"
        | "account_unbanned"
        | "system_update"
        | "appeal_status_change"
        | "password_reset_request"
      >(input.notification_type),
      content_summary: contentSummary,
      created_at: toISOStringSafe(input.created_at),
      is_read: input.is_read,
      unread_count: unreadCount,
      source: source,
      triggering_action: triggeringAction,
      priority_level: priorityLevel,
      notification_category: notificationCategory,
      triggering_event: triggeringEvent,
      status: status,
    };
  }
}
