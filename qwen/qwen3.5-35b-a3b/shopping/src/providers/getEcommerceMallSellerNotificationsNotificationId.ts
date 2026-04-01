import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallNotificationTransformer } from "../transformers/EcommerceMallNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerNotificationsNotificationId(props: {
  seller: SellerPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallNotification> {
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findFirstOrThrow({
      where: {
        id: props.notificationId,
        deleted_at: null,
      },
      select: {
        ...EcommerceMallNotificationTransformer.select().select,
        sellerRef: { select: { id: true } },
      },
    });
  const hasAccess =
    notification.sellerRef !== null &&
    notification.sellerRef.id === props.seller.id;
  if (!hasAccess) {
    throw new HttpException("Notification not found", 404);
  }
  return await EcommerceMallNotificationTransformer.transform(notification);
}
