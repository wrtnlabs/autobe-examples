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
  const unreadCountResult =
    await MyGlobal.prisma.ecommerce_mall_notification_recipients.aggregate({
      where: {
        recipient_type: "admin",
        recipient_id: adminId,
        read_status: "unread",
        deleted_at: null,
      },
      _count: {
        id: true,
      },
    });
  const unreadCount: number & tags.Type<"int32"> = unreadCountResult._count
    .id as unknown as number & tags.Type<"int32">;
  const recentNotificationRecords =
    await MyGlobal.prisma.ecommerce_mall_notification_recipients.findMany({
      where: {
        recipient_type: "admin",
        recipient_id: adminId,
        deleted_at: null,
      },
      orderBy: {
        notification: {
          created_at: "desc",
        },
      },
      take: 10,
      include: {
        notification: true,
      },
    });
  const notificationSummaries: IEcommerceMallNotification.ISummary[] =
    await ArrayUtil.asyncMap(recentNotificationRecords, async (record) => ({
      id: record.notification.id,
      title: record.notification.title,
      body: record.notification.body,
      type: record.notification.type,
      status: record.read_status,
      created_at: toISOStringSafe(record.notification.created_at),
      updated_at: toISOStringSafe(record.notification.updated_at),
    }));
  const totalUnread: number & tags.Type<"int32"> = unreadCount;
  const systemAlertRecords =
    await MyGlobal.prisma.ecommerce_mall_notification_recipients.findMany({
      where: {
        recipient_type: "admin",
        recipient_id: adminId,
        read_status: "unread",
        deleted_at: null,
        notification: {
          type: {
            in: ["platform_announcement", "system_alert"] as const,
          },
        },
      },
      take: 1,
      include: {
        notification: true,
      },
    });
  const systemAlert: IEcommerceMallNotificationDashboard["systemAlert"] =
    systemAlertRecords.length > 0
      ? {
          hasAlert: true,
          alertMessage:
            systemAlertRecords[0]?.notification.body === undefined
              ? undefined
              : systemAlertRecords[0]?.notification.body,
          alertLevel:
            systemAlertRecords[0]?.notification.type === "system_alert"
              ? "warning"
              : systemAlertRecords[0]?.notification.type ===
                  "platform_announcement"
                ? "info"
                : undefined,
        }
      : undefined;
  return {
    unreadCount,
    recentNotifications: notificationSummaries,
    totalUnread,
    systemAlert,
  } satisfies IEcommerceMallNotificationDashboard;
}
