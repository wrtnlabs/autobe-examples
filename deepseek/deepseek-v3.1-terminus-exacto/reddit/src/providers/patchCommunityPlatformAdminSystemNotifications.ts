import { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminSystemNotifications(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemNotification.IRequest;
}): Promise<IPageICommunityPlatformSystemNotification.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build comprehensive where filter with proper type safety
  const whereInput: Prisma.community_platform_system_notificationsWhereInput = {
    ...(props.body.notification_type !== null &&
      props.body.notification_type !== undefined && {
        notification_type: props.body.notification_type,
      }),
    ...(props.body.priority !== null &&
      props.body.priority !== undefined && {
        priority: props.body.priority,
      }),
    ...(props.body.status !== null &&
      props.body.status !== undefined && {
        status: props.body.status,
      }),
    ...(props.body.is_broadcast !== null &&
      props.body.is_broadcast !== undefined && {
        is_broadcast: props.body.is_broadcast,
      }),
    ...(props.body.related_community_id !== null &&
      props.body.related_community_id !== undefined && {
        related_community_id: props.body.related_community_id,
      }),
    ...(props.body.related_post_id !== null &&
      props.body.related_post_id !== undefined && {
        related_post_id: props.body.related_post_id,
      }),
    ...(props.body.related_comment_id !== null &&
      props.body.related_comment_id !== undefined && {
        related_comment_id: props.body.related_comment_id,
      }),
    ...(props.body.created_at_from !== null &&
      props.body.created_at_from !== undefined && {
        created_at: { gte: props.body.created_at_from },
      }),
    ...(props.body.created_at_to !== null &&
      props.body.created_at_to !== undefined && {
        created_at: { lte: props.body.created_at_to },
      }),
    ...(props.body.processed_at_from !== null &&
      props.body.processed_at_from !== undefined && {
        processed_at: { gte: props.body.processed_at_from },
      }),
    ...(props.body.processed_at_to !== null &&
      props.body.processed_at_to !== undefined && {
        processed_at: { lte: props.body.processed_at_to },
      }),
    ...(props.body.search !== null &&
      props.body.search !== undefined &&
      props.body.search.trim() !== "" && {
        OR: [
          {
            title: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            message: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
  };
  // Execute queries sequentially (not in parallel) for better error handling
  const data =
    await MyGlobal.prisma.community_platform_system_notifications.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      select: {
        id: true,
        notification_type: true,
        title: true,
        priority: true,
        status: true,
        is_broadcast: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_system_notifications.count({
      where: whereInput,
    });
  // Transform results to ISummary format with proper type safety
  const transformedData = data.map(
    (notification) =>
      ({
        id: notification.id as string & tags.Format<"uuid">,
        notification_type: notification.notification_type,
        title: notification.title,
        priority: notification.priority,
        status: notification.status,
        is_broadcast: notification.is_broadcast,
        created_at: toISOStringSafe(notification.created_at) as string &
          tags.Format<"date-time">,
      }) satisfies ICommunityPlatformSystemNotification.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / Math.max(1, limit)),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
