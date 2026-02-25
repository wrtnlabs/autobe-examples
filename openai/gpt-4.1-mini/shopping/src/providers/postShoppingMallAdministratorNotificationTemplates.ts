import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallNotificationTemplateCollector } from "../collectors/ShoppingMallNotificationTemplateCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallNotificationTemplateTransformer } from "../transformers/ShoppingMallNotificationTemplateTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorNotificationTemplates(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallNotificationTemplate.ICreate;
}): Promise<IShoppingMallNotificationTemplate> {
  // Check if a notification template with the same template_code already exists
  const existing =
    await MyGlobal.prisma.shopping_mall_notification_templates.findUnique({
      where: { template_code: props.body.template_code },
    });
  if (existing !== null) {
    throw new HttpException("Notification template code already exists", 400);
  }
  // Use collector to get create data, generate id and timestamps inside collector
  const data = await ShoppingMallNotificationTemplateCollector.collect({
    body: props.body,
  });
  // Create notification template in the database
  const created =
    await MyGlobal.prisma.shopping_mall_notification_templates.create({
      data,
      ...ShoppingMallNotificationTemplateTransformer.select(),
    });
  // Transform database data to DTO response
  return await ShoppingMallNotificationTemplateTransformer.transform(created);
}
