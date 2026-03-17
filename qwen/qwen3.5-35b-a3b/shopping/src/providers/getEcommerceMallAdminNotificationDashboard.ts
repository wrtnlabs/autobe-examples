import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEcommerceMallNotificationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotificationDashboard";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallAdminNotificationDashboard(props: {
  admin: AdminPayload;
}): Promise<IEcommerceMallNotificationDashboard> {
  const adminId = props.admin.id;
  // Count unread notifications for this admin
  const unreadCount = await MyGlobal.prisma.ecommerce_mall_notifications.count({
    where: {
      status: "unread",
      notificationOfSuperAdmin: {
        ...({ some: { admin_id: adminId } } as any),
      },
    },
  });
  // Fetch 10 most recent notifications with their status
  const recentNotificationsRaw =
    await MyGlobal.prisma.ecommerce_mall_notifications.findMany({
      where: {
        notificationOfSuperAdmin: {
          ...({ some: { admin_id: adminId } } as any),
        },
      },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Transform to notification summaries using manual mapping (no transformer available for ISummary)
  const recentNotifications = recentNotificationsRaw.map((notification) => ({
    id: notification.id as string & tags.Format<"uuid">,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    status: notification.status,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
  }));
  // Check for system alerts (platform_announcement or system_alert type with unread status)
  const systemAlertCount =
    await MyGlobal.prisma.ecommerce_mall_notifications.count({
      where: {
        status: "unread",
        type: {
          in: ["platform_announcement", "system_alert"],
        },
        notificationOfSuperAdmin: {
          ...({ some: { admin_id: adminId } } as any),
        },
      },
    });
  const systemAlert: IEcommerceMallNotificationDashboard["systemAlert"] =
    systemAlertCount > 0
      ? {
          hasAlert: true,
          alertLevel: "critical" as const,
        }
      : undefined;
  return {
    unreadCount: unreadCount as number & tags.Type<"int32">,
    recentNotifications:
      recentNotifications as IEcommerceMallNotification.ISummary[],
    totalUnread: unreadCount as number & tags.Type<"int32">,
    systemAlert,
  } satisfies IEcommerceMallNotificationDashboard;
}
