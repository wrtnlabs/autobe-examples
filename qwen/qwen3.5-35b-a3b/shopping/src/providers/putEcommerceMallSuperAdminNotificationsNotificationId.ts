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

export async function putEcommerceMallSuperAdminNotificationsNotificationId(props: {
  superAdmin: SuperadminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IEcommerceMallNotification.IUpdate;
}): Promise<IEcommerceMallNotification> {
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUniqueOrThrow({
      where: { id: props.notificationId },
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (notification.deleted_at !== null) {
    throw new HttpException("Notification not found", 404);
  }
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
    updateData.type = props.body.type;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  try {
    await MyGlobal.prisma.ecommerce_mall_notifications.update({
      where: { id: props.notificationId },
      data: updateData,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.constructor.name === "PrismaClientKnownRequestError"
    ) {
      const prismaError = error as any;
      if (prismaError.code === "P2002") {
        throw new HttpException(
          "Notification type or status already exists",
          409,
        );
      }
    }
    throw error;
  }
  const updated =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUniqueOrThrow({
      where: { id: props.notificationId },
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return await EcommerceMallNotificationTransformer.transform(updated);
}
