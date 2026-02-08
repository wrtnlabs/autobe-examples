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

export async function putShoppingMallAdministratorNotificationTemplatesNotificationTemplateId(props: {
  administrator: AdministratorPayload;
  notificationTemplateId: string & tags.Format<"uuid">;
  body: any; // Casting to any because IUpdate seems missing properties
}): Promise<IShoppingMallNotificationTemplate> {
  const existing =
    await MyGlobal.prisma.shopping_mall_notification_templates.findUnique({
      where: { id: props.notificationTemplateId },
    });
  if (!existing)
    throw new HttpException("Notification template not found", 404);
  const duplicate =
    await MyGlobal.prisma.shopping_mall_notification_templates.findFirst({
      where: {
        AND: [
          { template_code: props.body.template_code },
          { NOT: { id: props.notificationTemplateId } },
        ],
      },
    });
  if (duplicate) throw new HttpException("template_code must be unique", 400);
  const updated =
    await MyGlobal.prisma.shopping_mall_notification_templates.update({
      where: { id: props.notificationTemplateId },
      data: {
        template_code: props.body.template_code,
        template_name: props.body.template_name,
        content: props.body.content,
        parameters: props.body.parameters,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: updated.id,
    template_code: updated.template_code,
    template_name: updated.template_name,
    content: updated.content,
    parameters: updated.parameters,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
