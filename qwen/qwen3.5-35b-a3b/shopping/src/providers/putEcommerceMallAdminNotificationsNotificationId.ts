import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallNotificationTransformer } from "../transformers/EcommerceMallNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminNotificationsNotificationId(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IEcommerceMallNotification.IUpdate;
}): Promise<IEcommerceMallNotification> {
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUniqueOrThrow({
      where: { id: props.notificationId },
      select: { deleted_at: true },
    });
  if (notification.deleted_at !== null) {
    throw new HttpException("Notification not found", 404);
  }
  const updated = await MyGlobal.prisma.ecommerce_mall_notifications.update({
    where: { id: props.notificationId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.body !== undefined && { body: props.body.body }),
      ...(props.body.type !== undefined && { type: props.body.type }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: new Date(),
    },
    ...EcommerceMallNotificationTransformer.select(),
  });
  return await EcommerceMallNotificationTransformer.transform(updated);
}
