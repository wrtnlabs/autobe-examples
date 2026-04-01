import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { EcommerceMallNotificationTransformer } from "../transformers/EcommerceMallNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminNotificationsNotificationId(props: {
  superAdmin: SuperAdminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallNotification> {
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUniqueOrThrow({
      where: {
        id: props.notificationId,
        deleted_at: null,
      },
      select: {
        created_at: true,
        updated_at: true,
        id: true,
        status: true,
        deleted_at: true,
        title: true,
        body: true,
        type: true,
        recipients: {
          select: {
            id: true,
          },
        },
        customerReference: {
          select: {
            id: true,
          },
        },
        sellerRef: {
          select: {
            id: true,
          },
        },
        adminReference: {
          select: {
            id: true,
          },
        },
        notificationOfSuperAdmin: {
          select: {
            id: true,
          },
        },
        guestReference: {
          select: {
            id: true,
          },
        },
      },
    });
  const notificationOfSuperAdmin = notification.notificationOfSuperAdmin;
  if (
    !notificationOfSuperAdmin ||
    notificationOfSuperAdmin.id !== props.superAdmin.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallNotificationTransformer.transform(notification);
}
