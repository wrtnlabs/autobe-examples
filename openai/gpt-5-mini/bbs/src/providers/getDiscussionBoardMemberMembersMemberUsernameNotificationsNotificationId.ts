import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getDiscussionBoardMemberMembersMemberUsernameNotificationsNotificationId(props: {
  member: MemberPayload;
  memberUsername: string;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardNotification> {
  const { member, memberUsername, notificationId } = props;

  // Resolve the target member by username (must exist and not be soft-deleted)
  const targetMember =
    await MyGlobal.prisma.discussion_board_member.findFirstOrThrow({
      where: { username: memberUsername, deleted_at: null },
    });

  // Authorization: requester must be the target member
  if (targetMember.id !== member.id) {
    throw new HttpException("Unauthorized: access denied", 403);
  }

  // Fetch the notification with related summaries. Exclude soft-deleted notifications.
  const notification =
    await MyGlobal.prisma.discussion_board_notifications.findFirstOrThrow({
      where: {
        id: notificationId,
        recipient_member_id: targetMember.id,
        deleted_at: null,
      },
      include: {
        recipient: true,
        subscription: { include: { member: true } },
        article: { include: { author: true, category: true } },
      },
    });

  // Recipient summary (non-null because notification.recipient_member_id is required in schema)
  const recipient = notification.recipient
    ? {
        id: notification.recipient.id as string & tags.Format<"uuid">,
        username: notification.recipient.username,
        display_name: notification.recipient.display_name ?? null,
        created_at: toISOStringSafe(notification.recipient.created_at),
      }
    : null;

  // Subscription summary if present
  const subscription = notification.subscription
    ? {
        id: notification.subscription.id as string & tags.Format<"uuid">,
        member: {
          id: notification.subscription.member.id as string &
            tags.Format<"uuid">,
          username: notification.subscription.member.username,
          display_name: notification.subscription.member.display_name ?? null,
          created_at: toISOStringSafe(
            notification.subscription.member.created_at,
          ),
        },
        targetType: notification.subscription.target_type as
          | "article"
          | "author",
        targetId: notification.subscription.target_id as string &
          tags.Format<"uuid">,
        deliveryMode: notification.subscription.delivery_mode as
          | "immediate"
          | "daily_digest",
        active: notification.subscription.active,
        lastNotifiedAt: notification.subscription.last_notified_at
          ? toISOStringSafe(notification.subscription.last_notified_at)
          : undefined,
        createdAt: toISOStringSafe(notification.subscription.created_at),
        updatedAt: notification.subscription.updated_at
          ? toISOStringSafe(notification.subscription.updated_at)
          : undefined,
        deletedAt: notification.subscription.deleted_at
          ? toISOStringSafe(notification.subscription.deleted_at)
          : undefined,
      }
    : undefined;

  // Article summary if present
  const article = notification.article
    ? {
        id: notification.article.id as string & tags.Format<"uuid">,
        title: notification.article.title,
        excerpt: undefined,
        author: notification.article.author
          ? {
              id: notification.article.author.id as string &
                tags.Format<"uuid">,
              username: notification.article.author.username,
              display_name: notification.article.author.display_name ?? null,
              created_at: toISOStringSafe(
                notification.article.author.created_at,
              ),
            }
          : null,
        isPinned: notification.article.is_pinned ?? undefined,
        publishedAt: notification.article.published_at
          ? toISOStringSafe(notification.article.published_at)
          : undefined,
        createdAt: toISOStringSafe(notification.article.created_at),
        updatedAt: notification.article.updated_at
          ? toISOStringSafe(notification.article.updated_at)
          : undefined,
        category: notification.article.category
          ? {
              id: notification.article.category.id as string &
                tags.Format<"uuid">,
              name: notification.article.category.name,
              slug: notification.article.category.slug,
              description: notification.article.category.description ?? null,
              is_active: notification.article.category.is_active,
              sort_order: notification.article.category.sort_order ?? undefined,
              created_at: toISOStringSafe(
                notification.article.category.created_at,
              ),
              updated_at: notification.article.category.updated_at
                ? toISOStringSafe(notification.article.category.updated_at)
                : undefined,
              deleted_at: notification.article.category.deleted_at
                ? toISOStringSafe(notification.article.category.deleted_at)
                : undefined,
            }
          : undefined,
      }
    : undefined;

  // Build final DTO mapping, converting Date values to ISO strings
  return {
    id: notification.id as string & tags.Format<"uuid">,
    recipientId: notification.recipient_member_id as string &
      tags.Format<"uuid">,
    recipient,
    subscriptionId:
      notification.discussion_board_subscription_id === null
        ? undefined
        : (notification.discussion_board_subscription_id as string &
            tags.Format<"uuid">),
    subscription,
    articleId:
      notification.discussion_board_article_id === null
        ? undefined
        : (notification.discussion_board_article_id as string &
            tags.Format<"uuid">),
    article,
    type: notification.type,
    payload: notification.payload ?? undefined,
    status: notification.status,
    priority: notification.priority,
    deliveryAttempts: notification.delivery_attempts,
    lastAttemptedAt: notification.last_attempted_at
      ? toISOStringSafe(notification.last_attempted_at)
      : undefined,
    nextRetryAt: notification.next_retry_at
      ? toISOStringSafe(notification.next_retry_at)
      : undefined,
    scheduledAt: toISOStringSafe(notification.scheduled_at),
    sentAt: notification.sent_at
      ? toISOStringSafe(notification.sent_at)
      : undefined,
    failReason: notification.fail_reason ?? undefined,
    createdAt: toISOStringSafe(notification.created_at),
    updatedAt: toISOStringSafe(notification.updated_at),
    deletedAt: notification.deleted_at
      ? toISOStringSafe(notification.deleted_at)
      : undefined,
  };
}
