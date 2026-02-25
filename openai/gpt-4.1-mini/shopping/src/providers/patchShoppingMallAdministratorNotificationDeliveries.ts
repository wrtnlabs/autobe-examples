import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationDelivery";
import { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
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

export async function patchShoppingMallAdministratorNotificationDeliveries(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallNotificationDelivery.IRequest;
}): Promise<IPageIShoppingMallNotificationDelivery.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_notification_deliveriesWhereInput = {
    deleted_at: null,
    ...(props.body.shoppingMallNotificationTemplateId
      ? {
          shopping_mall_notification_template_id:
            props.body.shoppingMallNotificationTemplateId,
        }
      : {}),
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.channel ? { channel: props.body.channel } : {}),
  };
  if (props.body.attemptedAtFrom != null) {
    where.attempted_at = {
      ...(typeof where.attempted_at === "object" && where.attempted_at !== null
        ? where.attempted_at
        : {}),
      gte: new Date(props.body.attemptedAtFrom.toString()),
    };
  }
  if (props.body.attemptedAtTo != null) {
    where.attempted_at = {
      ...(typeof where.attempted_at === "object" && where.attempted_at !== null
        ? where.attempted_at
        : {}),
      lte: new Date(props.body.attemptedAtTo.toString()),
    };
  }
  const total =
    await MyGlobal.prisma.shopping_mall_notification_deliveries.count({
      where,
    });
  const records =
    await MyGlobal.prisma.shopping_mall_notification_deliveries.findMany({
      where,
      skip,
      take: limit,
      orderBy: { attempted_at: "desc" },
      select: {
        id: true,
        channel: true,
        status: true,
        attempted_at: true,
        delivered_at: true,
        created_at: true,
        updated_at: true,
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
  const filteredRecords = props.body.ownerType
    ? records.filter(
        (r) => r.userNotification.owner_type === props.body.ownerType,
      )
    : records;
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: await Promise.all(
      filteredRecords.map(async (r) => ({
        id: r.id,
        channel: r.channel,
        status: r.status,
        attemptedAt: (r.attempted_at?.toISOString() ??
          new Date(0).toISOString()) satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        deliveredAt: (r.delivered_at?.toISOString() ??
          new Date(0).toISOString()) satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        createdAt: (r.created_at?.toISOString() ??
          new Date(0).toISOString()) satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        updatedAt: (r.updated_at?.toISOString() ??
          new Date(0).toISOString()) satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        deletedAt: (r.deleted_at?.toISOString() ??
          new Date(0).toISOString()) satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        notificationTemplate: {
          id: r.notificationTemplate.id,
          template_code: r.notificationTemplate.template_code,
          template_name: r.notificationTemplate.template_name,
          content: r.notificationTemplate.content,
          created_at: (r.notificationTemplate.created_at?.toISOString() ??
            new Date(0).toISOString()) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          updated_at: (r.notificationTemplate.updated_at?.toISOString() ??
            new Date(0).toISOString()) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          deleted_at: (r.notificationTemplate.deleted_at?.toISOString() ??
            new Date(0).toISOString()) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
        },
        userNotification: {
          id: r.userNotification.id,
          ownerType: r.userNotification.owner_type,
          title: r.userNotification.title,
          body: r.userNotification.body,
          url: r.userNotification.url ?? null,
          imageUrl: r.userNotification.image_url ?? null,
          isRead: r.userNotification.is_read,
          deliveredAt: (r.userNotification.delivered_at?.toISOString() ??
            new Date(0).toISOString()) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          readAt: (r.userNotification.read_at?.toISOString() ??
            new Date(0).toISOString()) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          createdAt: (r.userNotification.created_at?.toISOString() ??
            new Date(0).toISOString()) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          updatedAt: (r.userNotification.updated_at?.toISOString() ??
            new Date(0).toISOString()) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          deletedAt: (r.userNotification.deleted_at?.toISOString() ??
            new Date(0).toISOString()) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          notificationTemplateId: r.userNotification.notification_template_id,
        },
      })),
    ),
  };
}
