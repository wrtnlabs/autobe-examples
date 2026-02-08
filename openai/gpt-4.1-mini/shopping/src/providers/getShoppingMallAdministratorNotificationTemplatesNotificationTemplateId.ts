import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
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

export async function getShoppingMallAdministratorNotificationTemplatesNotificationTemplateId(props: {
  administrator: AdministratorPayload;
  notificationTemplateId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallNotificationTemplate> {
  const notificationTemplate =
    await MyGlobal.prisma.shopping_mall_notification_templates.findUnique({
      where: { id: props.notificationTemplateId },
    });
  if (notificationTemplate === null) {
    throw new HttpException("Notification template not found", 404);
  }
  return {
    ...notificationTemplate,
    created_at: notificationTemplate.created_at,
    updated_at: notificationTemplate.updated_at,
    deleted_at: notificationTemplate.deleted_at ?? null,
  };
}
