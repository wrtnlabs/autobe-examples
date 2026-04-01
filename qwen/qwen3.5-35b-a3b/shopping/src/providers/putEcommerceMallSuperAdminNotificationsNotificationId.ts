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

export async function putEcommerceMallSuperAdminNotificationsNotificationId(props: {
  superAdmin: SuperAdminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IEcommerceMallNotification.IUpdate;
}): Promise<IEcommerceMallNotification> {
  const existingNotification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUniqueOrThrow({
      where: {
        id: props.notificationId,
        deleted_at: null,
      },
    });
  const updateData: {
    title?: string;
    body?: string;
    type?: string;
    status?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.body !== undefined) {
    updateData.body = props.body.body;
  }
  if (props.body.type !== undefined) {
    const typeCollision =
      await MyGlobal.prisma.ecommerce_mall_notifications.findFirst({
        where: {
          type: props.body.type,
          id: {
            not: props.notificationId,
          },
        },
      });
    if (typeCollision !== null) {
      throw new HttpException("Notification type must be unique", 409);
    }
    updateData.type = props.body.type;
  }
  if (props.body.status !== undefined) {
    const statusCollision =
      await MyGlobal.prisma.ecommerce_mall_notifications.findFirst({
        where: {
          status: props.body.status,
          id: {
            not: props.notificationId,
          },
        },
      });
    if (statusCollision !== null) {
      throw new HttpException("Notification status must be unique", 409);
    }
    updateData.status = props.body.status;
  }
  const updatedNotification =
    await MyGlobal.prisma.ecommerce_mall_notifications.update({
      where: {
        id: props.notificationId,
      },
      data: updateData,
      ...EcommerceMallNotificationTransformer.select(),
    });
  return await EcommerceMallNotificationTransformer.transform(
    updatedNotification,
  );
}
