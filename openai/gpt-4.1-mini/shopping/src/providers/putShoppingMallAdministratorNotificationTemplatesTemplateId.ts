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
import { ShoppingMallNotificationTemplateTransformer } from "../transformers/ShoppingMallNotificationTemplateTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorNotificationTemplatesTemplateId(props: {
  administrator: AdministratorPayload;
  templateId: string & tags.Format<"uuid">;
  body: IShoppingMallNotificationTemplate.IUpdate;
}): Promise<IShoppingMallNotificationTemplate> {
  await MyGlobal.prisma.shopping_mall_notification_templates.findUniqueOrThrow({
    where: {
      id: props.templateId,
    },
  });
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_notification_templates.update({
      where: {
        id: props.templateId,
      },
      data: {
        template_code: props.body.templateCode,
        template_name: props.body.templateName,
        content: props.body.content,
        parameters: props.body.parameters,
        deleted_at: props.body.deletedAt ?? null,
        updated_at: now,
      },
    });
    return tx.shopping_mall_notification_templates.findUniqueOrThrow({
      where: { id: props.templateId },
      select: {
        id: true,
        template_code: true,
        template_name: true,
        content: true,
        parameters: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        userNotifications: true,
        notificationDeliveries: true,
        logs: true,
      },
    });
  });
  return await ShoppingMallNotificationTemplateTransformer.transform(updated);
}
