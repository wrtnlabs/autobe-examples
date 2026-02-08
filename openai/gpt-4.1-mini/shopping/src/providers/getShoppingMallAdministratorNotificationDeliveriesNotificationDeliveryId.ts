import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
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

export async function getShoppingMallAdministratorNotificationDeliveriesNotificationDeliveryId(props: {
  administrator: AdministratorPayload;
  notificationDeliveryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallNotificationDelivery> {
  const record =
    await MyGlobal.prisma.shopping_mall_notification_deliveries.findUnique({
      where: { id: props.notificationDeliveryId },
      include: {
        userNotification: true,
        notificationTemplate: true,
      },
    });
  if (!record) {
    throw new HttpException("Notification Delivery not found", 404);
  }
  function toDateTimeString(
    value: Date | string | null | undefined,
  ): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value;
    return toISOStringSafe(value);
  }
  const transformNotificationDelivery = (
    input: typeof record,
  ): IShoppingMallNotificationDelivery => ({
    id: input.id as string & tags.Format<"uuid">,
    userNotificationId: input.shopping_mall_user_notification_id as string &
      tags.Format<"uuid">,
    notificationTemplateId:
      input.shopping_mall_notification_template_id as string &
        tags.Format<"uuid">,
    channel: input.channel,
    status: input.status as
      | "pending"
      | "succeeded"
      | "failed"
      | "validated"
      | "canceled",
    attemptAt: toDateTimeString(input.attempted_at) as
      | (string & tags.Format<"date-time">)
      | null,
    successAt: toDateTimeString(input.delivered_at) as
      | (string & tags.Format<"date-time">)
      | null,
    createdAt: toDateTimeString(input.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toDateTimeString(input.updated_at) as
      | (string & tags.Format<"date-time">)
      | null,
    userNotification: input.userNotification
      ? {
          id: input.userNotification.id as string & tags.Format<"uuid">,
          userId: input.userNotification.owner_id as string &
            tags.Format<"uuid">,
          notificationTemplateId: input.userNotification
            .notification_template_id as string & tags.Format<"uuid">,
          title: input.userNotification.title,
          message: input.userNotification.body,
          readAt: toDateTimeString(input.userNotification.read_at) as
            | (string & tags.Format<"date-time">)
            | null,
          createdAt: toDateTimeString(
            input.userNotification.created_at,
          ) as string & tags.Format<"date-time">,
          updatedAt: toDateTimeString(input.userNotification.updated_at) as
            | (string & tags.Format<"date-time">)
            | null,
        }
      : null,
    notificationTemplate: input.notificationTemplate
      ? {
          id: input.notificationTemplate.id as string & tags.Format<"uuid">,
          code: input.notificationTemplate.template_code,
          title: input.notificationTemplate.template_name,
          content: input.notificationTemplate.content,
          createdAt: toDateTimeString(
            input.notificationTemplate.created_at,
          ) as string & tags.Format<"date-time">,
          updatedAt: toDateTimeString(input.notificationTemplate.updated_at) as
            | (string & tags.Format<"date-time">)
            | null,
        }
      : null,
  });
  return transformNotificationDelivery(record);
}
