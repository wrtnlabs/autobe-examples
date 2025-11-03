import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberMembersMemberUsernameNotifications(props: {
  member: MemberPayload;
  memberUsername: string;
  body: IDiscussionBoardNotification.IRequest;
}): Promise<IPageIDiscussionBoardNotification.ISummary> {
  const { member, memberUsername, body } = props;

  // Resolve target member and authorize ownership
  const targetMember = await MyGlobal.prisma.discussion_board_member.findUnique(
    {
      where: { username: memberUsername },
      select: {
        id: true,
        username: true,
        created_at: true,
        display_name: true,
        deleted_at: true,
      },
    },
  );

  if (!targetMember || targetMember.deleted_at)
    throw new HttpException("Not Found", 404);
  if (targetMember.id !== member.id) throw new HttpException("Forbidden", 403);

  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    recipient_member_id: targetMember.id,
    deleted_at: null,
  };

  if (body.status && body.status.length > 0)
    Object.assign(whereCondition, { status: { in: body.status } });
  if (body.type !== undefined && body.type !== null)
    Object.assign(whereCondition, { type: body.type });
  if (body.subscriptionId !== undefined && body.subscriptionId !== null)
    Object.assign(whereCondition, {
      discussion_board_subscription_id: body.subscriptionId,
    });
  if (body.articleId !== undefined && body.articleId !== null)
    Object.assign(whereCondition, {
      discussion_board_article_id: body.articleId,
    });
  if (body.hasPayload === true)
    Object.assign(whereCondition, { payload: { not: null } });

  if (body.scheduledBefore !== undefined && body.scheduledBefore !== null) {
    Object.assign(whereCondition, {
      scheduled_at: {
        ...(whereCondition.scheduled_at ?? {}),
        lte: toISOStringSafe(body.scheduledBefore),
      },
    });
  }
  if (body.scheduledAfter !== undefined && body.scheduledAfter !== null) {
    Object.assign(whereCondition, {
      scheduled_at: {
        ...(whereCondition.scheduled_at ?? {}),
        gte: toISOStringSafe(body.scheduledAfter),
      },
    });
  }

  // Avoid runtime validation like trim(); check for empty string explicitly
  if (body.q !== undefined && body.q !== null && body.q !== "") {
    Object.assign(whereCondition, {
      OR: [
        { payload: { contains: body.q } },
        { article: { title: { contains: body.q } } },
      ],
    });
  }

  if (body.bulkAction !== undefined && body.bulkAction !== null) {
    const now = toISOStringSafe(new Date());
    const action = (
      body.bulkAction as { action?: string; apply_to_all?: boolean }
    ).action;
    const applyAll =
      (body.bulkAction as { action?: string; apply_to_all?: boolean })
        .apply_to_all === true;

    if (applyAll) {
      await MyGlobal.prisma.discussion_board_notifications.updateMany({
        where: whereCondition,
        data: {
          updated_at: now,
          ...(action === "mark_as_read" ? { status: "sent" } : {}),
        },
      });
    } else if (
      Array.isArray(body.notificationIds) &&
      body.notificationIds.length > 0
    ) {
      await MyGlobal.prisma.discussion_board_notifications.updateMany({
        where: {
          id: { in: body.notificationIds },
          recipient_member_id: targetMember.id,
        },
        data: {
          updated_at: now,
          ...(action === "mark_as_read" ? { status: "sent" } : {}),
        },
      });
    }

    const auditNow = toISOStringSafe(new Date());
    await MyGlobal.prisma.discussion_board_moderation_audit.create({
      data: {
        id: v4(),
        event_type: "notification.bulk_action",
        event_payload: JSON.stringify({
          performed_by: member.id,
          action: action ?? null,
          apply_to_all: applyAll,
        }),
        occurred_at: auditNow,
      },
    });
  }

  const [total, rows] = await Promise.all([
    MyGlobal.prisma.discussion_board_notifications.count({
      where: whereCondition,
    }),
    MyGlobal.prisma.discussion_board_notifications.findMany({
      where: whereCondition,
      orderBy:
        body.sort === "scheduledAt"
          ? { scheduled_at: "asc" }
          : body.sort === "-scheduledAt"
            ? { scheduled_at: "desc" }
            : body.sort === "createdAt"
              ? { created_at: "asc" }
              : body.sort === "-createdAt"
                ? { created_at: "desc" }
                : { scheduled_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        priority: true,
        scheduled_at: true,
        sent_at: true,
        fail_reason: true,
        created_at: true,
        updated_at: true,
        delivery_attempts: true,
        last_attempted_at: true,
        next_retry_at: true,
        recipient: {
          select: {
            id: true,
            username: true,
            display_name: true,
            created_at: true,
          },
        },
        subscription: {
          select: {
            id: true,
            target_type: true,
            target_id: true,
            delivery_mode: true,
            active: true,
            last_notified_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            member: {
              select: {
                id: true,
                username: true,
                display_name: true,
                created_at: true,
              },
            },
          },
        },
        article: {
          select: {
            id: true,
            title: true,
            is_pinned: true,
            published_at: true,
            created_at: true,
            updated_at: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                is_active: true,
                sort_order: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            author: {
              select: {
                id: true,
                username: true,
                display_name: true,
                created_at: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const data = rows.map((r) => {
    const recipient = r.recipient
      ? {
          id: r.recipient.id,
          username: r.recipient.username,
          displayName: r.recipient.display_name ?? null,
          createdAt: toISOStringSafe(r.recipient.created_at),
        }
      : undefined;

    const subscription = r.subscription
      ? {
          id: r.subscription.id,
          member: r.subscription.member
            ? {
                id: r.subscription.member.id,
                username: r.subscription.member.username,
                displayName: r.subscription.member.display_name ?? null,
                createdAt: toISOStringSafe(r.subscription.member.created_at),
              }
            : undefined,
          targetType: r.subscription.target_type as "article" | "author",
          targetId: r.subscription.target_id,
          deliveryMode: r.subscription.delivery_mode as
            | "immediate"
            | "daily_digest",
          active: r.subscription.active,
          lastNotifiedAt: r.subscription.last_notified_at
            ? toISOStringSafe(r.subscription.last_notified_at)
            : null,
          createdAt: toISOStringSafe(r.subscription.created_at),
          updatedAt: r.subscription.updated_at
            ? toISOStringSafe(r.subscription.updated_at)
            : null,
          deletedAt: r.subscription.deleted_at
            ? toISOStringSafe(r.subscription.deleted_at)
            : null,
        }
      : undefined;

    const article = r.article
      ? {
          id: r.article.id,
          title: r.article.title,
          excerpt: undefined,
          author: r.article.author
            ? {
                id: r.article.author.id,
                username: r.article.author.username,
                displayName: r.article.author.display_name ?? null,
                createdAt: toISOStringSafe(r.article.author.created_at),
              }
            : undefined,
          isPinned: r.article.is_pinned ?? undefined,
          publishedAt: r.article.published_at
            ? toISOStringSafe(r.article.published_at)
            : null,
          createdAt: toISOStringSafe(r.article.created_at),
          updatedAt: r.article.updated_at
            ? toISOStringSafe(r.article.updated_at)
            : null,
          category: r.article.category
            ? {
                id: r.article.category.id,
                name: r.article.category.name,
                slug: r.article.category.slug,
                description: r.article.category.description ?? null,
                isActive: r.article.category.is_active,
                sortOrder: r.article.category.sort_order ?? null,
                createdAt: toISOStringSafe(r.article.category.created_at),
                updatedAt: r.article.category.updated_at
                  ? toISOStringSafe(r.article.category.updated_at)
                  : null,
                deletedAt: r.article.category.deleted_at
                  ? toISOStringSafe(r.article.category.deleted_at)
                  : null,
              }
            : undefined,
        }
      : undefined;

    return {
      id: r.id,
      type: r.type,
      status: r.status as "pending" | "sent" | "failed",
      priority: r.priority ?? undefined,
      scheduledAt: r.scheduled_at ? toISOStringSafe(r.scheduled_at) : undefined,
      sentAt: r.sent_at ? toISOStringSafe(r.sent_at) : null,
      failReason: r.fail_reason ?? null,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: r.updated_at ? toISOStringSafe(r.updated_at) : null,
      deliveryAttempts: r.delivery_attempts ?? undefined,
      lastAttemptedAt: r.last_attempted_at
        ? toISOStringSafe(r.last_attempted_at)
        : null,
      nextRetryAt: r.next_retry_at ? toISOStringSafe(r.next_retry_at) : null,
      recipient,
      subscription,
      article,
    };
  }) as unknown as IDiscussionBoardNotification.ISummary[];

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  } as unknown as IPageIDiscussionBoardNotification.ISummary;
}
