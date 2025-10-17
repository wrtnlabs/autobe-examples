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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberUsersUserIdNotifications(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardNotification.IRequest;
}): Promise<IPageIDiscussionBoardNotification.ISummary> {
  const { member, userId, body } = props;

  // MANDATORY AUTHORIZATION: Verify user can only access their own notifications
  if (member.id !== userId) {
    throw new HttpException(
      "Forbidden: You can only access your own notifications",
      403,
    );
  }

  // Calculate pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build WHERE clause with conditional filters
  const where = {
    user_id: userId,
    deleted_at: null,
    ...(body.notification_type !== undefined &&
      body.notification_type !== null && {
        notification_type: body.notification_type,
      }),
    ...(body.is_read !== undefined &&
      body.is_read !== null && {
        is_read: body.is_read,
      }),
    ...(body.delivered_in_app !== undefined &&
      body.delivered_in_app !== null && {
        delivered_in_app: body.delivered_in_app,
      }),
    ...(body.delivered_via_email !== undefined &&
      body.delivered_via_email !== null && {
        delivered_via_email: body.delivered_via_email,
      }),
    ...(body.related_topic_id !== undefined &&
      body.related_topic_id !== null && {
        related_topic_id: body.related_topic_id,
      }),
    ...(body.related_reply_id !== undefined &&
      body.related_reply_id !== null && {
        related_reply_id: body.related_reply_id,
      }),
    ...(body.triggering_member_id !== undefined &&
      body.triggering_member_id !== null && {
        triggering_member_id: body.triggering_member_id,
      }),
    ...((body.date_from !== undefined && body.date_from !== null) ||
    (body.date_to !== undefined && body.date_to !== null)
      ? {
          created_at: {
            ...(body.date_from !== undefined &&
              body.date_from !== null && {
                gte: body.date_from,
              }),
            ...(body.date_to !== undefined &&
              body.date_to !== null && {
                lte: body.date_to,
              }),
          },
        }
      : {}),
  };

  // Build orderBy with proper type narrowing
  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = (body.sort_order ?? "desc") as "asc" | "desc";

  const orderBy =
    sortBy === "created_at"
      ? { created_at: sortOrder }
      : sortBy === "notification_type"
        ? { notification_type: sortOrder }
        : sortBy === "read_at"
          ? { read_at: sortOrder }
          : { created_at: sortOrder };

  // Execute parallel queries for data and count
  const [notifications, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_notifications.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        notification_type: true,
        title: true,
        message: true,
        is_read: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_notifications.count({ where }),
  ]);

  // Transform notifications to API format
  const data = notifications.map((notification) => ({
    id: notification.id as string & tags.Format<"uuid">,
    notification_type: notification.notification_type,
    title: notification.title,
    message: notification.message,
    is_read: notification.is_read,
    created_at: toISOStringSafe(notification.created_at),
  }));

  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data,
  };
}
