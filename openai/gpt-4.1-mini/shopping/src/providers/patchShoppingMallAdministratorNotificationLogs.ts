import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationLog";
import { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorNotificationLogs(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallNotificationLog.IRequest;
}): Promise<IPageIShoppingMallNotificationLog.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip = props.body.offset ?? (page - 1) * limit;
  const where: Prisma.shopping_mall_notification_logsWhereInput = {
    deleted_at: null,
    ...(props.body.eventType ? { event_type: props.body.eventType } : {}),
    ...(props.body.notificationTemplateId
      ? { notification_template_id: props.body.notificationTemplateId }
      : {}),
    ...(props.body.userNotificationId
      ? { user_notification_id: props.body.userNotificationId }
      : {}),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo ? { lte: props.body.createdAtTo } : {}),
          },
        }
      : {}),
  };
  const data = await MyGlobal.prisma.shopping_mall_notification_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      event_type: true,
      event_metadata: true,
      created_at: true,
      deleted_at: true,
      notificationTemplate: {
        select: {
          id: true,
          template_code: true,
          template_name: true,
          content: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      userNotification: {
        select: {
          id: true,
          owner_type: true,
          title: true,
          body: true,
          url: true,
          image_url: true,
          is_read: true,
          delivered_at: true,
          read_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          notification_template_id: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_notification_logs.count({
    where,
  });
  const transformedData: IShoppingMallNotificationLog.ISummary[] = data.map(
    (log) => {
      return {
        id: log.id,
        eventType: log.event_type,
        eventMetadata: log.event_metadata,
        createdAt: toISOStringSafe(log.created_at ?? new Date()),
        deletedAt: toISOStringSafe(log.deleted_at ?? new Date()),
        notificationTemplate: log.notificationTemplate
          ? {
              id: log.notificationTemplate.id,
              template_code: log.notificationTemplate.template_code,
              template_name: log.notificationTemplate.template_name,
              content: log.notificationTemplate.content,
              created_at: toISOStringSafe(
                log.notificationTemplate.created_at ?? new Date(),
              ),
              updated_at: toISOStringSafe(
                log.notificationTemplate.updated_at ?? new Date(),
              ),
              deleted_at: toISOStringSafe(
                log.notificationTemplate.deleted_at ?? new Date(),
              ),
            }
          : null,
        userNotification: log.userNotification
          ? {
              id: log.userNotification.id,
              ownerType: log.userNotification.owner_type,
              title: log.userNotification.title,
              body: log.userNotification.body,
              url: log.userNotification.url,
              imageUrl: log.userNotification.image_url,
              isRead: log.userNotification.is_read,
              deliveredAt: toISOStringSafe(
                log.userNotification.delivered_at ?? new Date(),
              ),
              readAt: toISOStringSafe(
                log.userNotification.read_at ?? new Date(),
              ),
              createdAt: toISOStringSafe(
                log.userNotification.created_at ?? new Date(),
              ),
              updatedAt: toISOStringSafe(
                log.userNotification.updated_at ?? new Date(),
              ),
              deletedAt: toISOStringSafe(
                log.userNotification.deleted_at ?? new Date(),
              ),
              notificationTemplateId:
                log.userNotification.notification_template_id,
            }
          : null,
      };
    },
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
