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

export async function getEcommerceMallAdminNotificationsNotificationId(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallNotification> {
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUniqueOrThrow({
      where: { id: props.notificationId, deleted_at: null },
      ...EcommerceMallNotificationTransformer.select(),
    });
  return await EcommerceMallNotificationTransformer.transform(notification);
}
