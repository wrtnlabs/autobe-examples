import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserNotification";
import { IDiscussionBoardNotificationTypeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationTypeFilter";
import { IDiscussionBoardNotificationStatusFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationStatusFilter";
import { IDiscussionBoardDeliveryMethodFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDeliveryMethodFilter";
import { IDiscussionBoardNotificationSortField } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationSortField";
import { IDiscussionBoardSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSortOrder";
import { IPageIDiscussionBoardUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserNotification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberNotifications(props: {
  member: MemberPayload;
  body: IDiscussionBoardUserNotification.IRequest;
}): Promise<IPageIDiscussionBoardUserNotification.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;

  // Build WHERE condition
  const whereCondition: Prisma.discussion_board_user_notificationsWhereInput = {
    discussion_board_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.notification_type && {
      notification_type: props.body.notification_type,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.delivery_method && {
      delivery_method: props.body.delivery_method,
    }),
    ...(props.body.created_at_start || props.body.created_at_end
      ? {
          created_at: {
            ...(props.body.created_at_start && {
              gte: props.body.created_at_start,
            }),
            ...(props.body.created_at_end && {
              lte: props.body.created_at_end,
            }),
          },
        }
      : {}),
    ...(props.body.search
      ? {
          OR: [
            { title: { contains: props.body.search, mode: "insensitive" } },
            { message: { contains: props.body.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // Build ORDER BY condition
  const orderByCondition: Prisma.discussion_board_user_notificationsOrderByWithRelationInput =
    props.body.sort_by
      ? { [props.body.sort_by]: props.body.order ?? "desc" }
      : { created_at: "desc" };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_notifications.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.discussion_board_user_notifications.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((notification) => ({
      id: notification.id,
      notification_type: notification.notification_type,
      title: notification.title,
      status: notification.status,
      delivery_method: notification.delivery_method,
      created_at: toISOStringSafe(notification.created_at),
    })),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
