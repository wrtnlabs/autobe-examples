import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
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

export async function putShoppingMallAdministratorNotificationLogsNotificationLogId(props: {
  administrator: AdministratorPayload;
  notificationLogId: string & tags.Format<"uuid">;
  body: IShoppingMallNotificationLog.IUpdate;
}): Promise<IShoppingMallNotificationLog> {
  const { notificationLogId, body } = props;
  const updatedLog = await MyGlobal.prisma.$transaction(async (prisma) => {
    const existingLog = await prisma.shopping_mall_notification_logs.findUnique(
      {
        where: { id: notificationLogId },
      },
    );
    if (existingLog === null) {
      throw new HttpException("Notification log not found", 404);
    }
    if (
      "notification_template_id" in body &&
      body.notification_template_id != null
    ) {
      const templateExists =
        await prisma.shopping_mall_notification_templates.findUnique({
          where: { id: body.notification_template_id as string },
        });
      if (templateExists === null)
        throw new HttpException("Notification template not found", 400);
    }
    if ("user_notification_id" in body && body.user_notification_id != null) {
      const userNotificationExists =
        await prisma.shopping_mall_user_notifications.findUnique({
          where: { id: body.user_notification_id as string },
        });
      if (userNotificationExists === null)
        throw new HttpException("User notification not found", 400);
    }
    if ("event_type" in body && body.event_type != null) {
      if (typeof body.event_type !== "string") {
        throw new HttpException("Invalid event_type", 400);
      }
    }
    if ("event_metadata" in body && body.event_metadata != null) {
      try {
        JSON.parse(body.event_metadata as string);
      } catch {
        throw new HttpException(
          "event_metadata must be a valid JSON string",
          400,
        );
      }
    }
    const dataToUpdate: {
      event_type?: string | undefined;
      event_metadata?: string | undefined;
      notification_template_id?: string | undefined;
      user_notification_id?: string | undefined;
    } = {};
    if ("event_type" in body) {
      if (body.event_type === null) {
        dataToUpdate.event_type = undefined;
      } else {
        dataToUpdate.event_type = body.event_type as string | undefined;
      }
    }
    if ("event_metadata" in body) {
      if (body.event_metadata === null) {
        dataToUpdate.event_metadata = undefined;
      } else {
        dataToUpdate.event_metadata = body.event_metadata as string | undefined;
      }
    }
    if ("notification_template_id" in body) {
      if (body.notification_template_id === null) {
        dataToUpdate.notification_template_id = undefined;
      } else {
        dataToUpdate.notification_template_id =
          body.notification_template_id as string | undefined;
      }
    }
    if ("user_notification_id" in body) {
      if (body.user_notification_id === null) {
        dataToUpdate.user_notification_id = undefined;
      } else {
        dataToUpdate.user_notification_id = body.user_notification_id as
          | string
          | undefined;
      }
    }
    const updated = await prisma.shopping_mall_notification_logs.update({
      where: { id: notificationLogId },
      data: dataToUpdate,
    });
    return {
      id: updated.id,
      notification_template_id: updated.notification_template_id ?? null,
      user_notification_id: updated.user_notification_id ?? null,
      event_type: updated.event_type ?? null,
      event_metadata: updated.event_metadata ?? null,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    };
  });
  return updatedLog;
}
