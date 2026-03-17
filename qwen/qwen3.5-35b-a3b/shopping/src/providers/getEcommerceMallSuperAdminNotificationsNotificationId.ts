import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallNotificationTransformer } from "../transformers/EcommerceMallNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminNotificationsNotificationId(props: {
  superAdmin: SuperadminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallNotification> {
  // Retrieve notification and verify it exists and is not soft-deleted
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUniqueOrThrow({
      where: {
        id: props.notificationId,
        deleted_at: null,
      },
      ...EcommerceMallNotificationTransformer.select(),
    });
  // Verify superAdmin has access to this notification via actor-specific reference table
  const accessRecord =
    await MyGlobal.prisma.ecommerce_mall_notification_of_super_admins.findFirst(
      {
        where: {
          id: notification.id,
          super_admin_id: props.superAdmin.id,
        },
      },
    );
  if (accessRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return
  return await EcommerceMallNotificationTransformer.transform(notification);
}
