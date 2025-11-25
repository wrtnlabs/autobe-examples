import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";
import { IPageIRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityNotification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchRedditCommunityMemberNotifications(props: {
  member: MemberPayload;
  body: IRedditCommunityNotification.IRequest;
}): Promise<IPageIRedditCommunityNotification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition = {
    recipient_id: props.member.id,
    deleted_at: null,
    ...(props.body.type && {
      notification_type: props.body.type,
    }),
    ...(props.body.is_read !== undefined &&
      props.body.is_read !== null && {
        read_at: props.body.is_read ? { not: null } : null,
      }),
    ...(() => {
      if (!props.body.created_after && !props.body.created_before) return {};
      return {
        created_at: {
          ...(props.body.created_after && { gte: props.body.created_after }),
          ...(props.body.created_before && { lte: props.body.created_before }),
        },
      };
    })(),
  };

  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const orderByMap = {
    created_at: { created_at: order },
    is_read: { read_at: order },
    type: { notification_type: order },
  };

  const orderByClause = orderByMap[sortBy];

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_notifications.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByClause,
      include: {
        recipient: true,
      },
    }),
    MyGlobal.prisma.reddit_community_notifications.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page - 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((notification) => ({
      id: notification.id,
      recipient_id: notification.recipient_id,
      notification_type: notification.notification_type,
      title: notification.title,
      is_read: notification.read_at !== null,
      created_at: toISOStringSafe(notification.created_at),
      member: {
        id: notification.recipient.id,
        username: notification.recipient.username,
        display_name:
          notification.recipient.display_name === null
            ? undefined
            : notification.recipient.display_name,
        bio:
          notification.recipient.bio === null
            ? undefined
            : notification.recipient.bio,
        avatar_url:
          notification.recipient.avatar_url === null
            ? undefined
            : notification.recipient.avatar_url,
        post_karma: notification.recipient.post_karma,
        comment_karma: notification.recipient.comment_karma,
        created_at: toISOStringSafe(notification.recipient.created_at),
      },
    })),
  };
}
