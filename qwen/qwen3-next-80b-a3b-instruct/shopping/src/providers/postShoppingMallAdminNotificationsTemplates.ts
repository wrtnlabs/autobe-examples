import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminNotificationsTemplates(props: {
  admin: AdminPayload;
  body: IShoppingMallNotificationTemplate.ICreate;
}): Promise<IShoppingMallNotificationTemplate> {
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.shopping_mall_notification_templates.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        title: props.body.title,
        subject: props.body.subject,
        body: props.body.body,
        type: props.body.type,
        language: props.body.language,
        active: props.body.active ?? false,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    ...created,
    createdAt: toISOStringSafe(
      created.created_at,
    ) satisfies string as string satisfies string &
      tags.Format<"date-time"> &
      tags.JsonSchemaPlugin<{
        "x-autobe-prisma-schema": "shopping_mall_notification_templates";
      }>,
    updatedAt: created.updated_at
      ? (toISOStringSafe(
          created.updated_at,
        ) satisfies string as string satisfies string &
          tags.Format<"date-time"> &
          tags.JsonSchemaPlugin<{
            "x-autobe-prisma-schema": "shopping_mall_notification_templates";
          }>)
      : undefined,
    deletedAt: created.deleted_at
      ? (toISOStringSafe(
          created.deleted_at,
        ) satisfies string as string satisfies string &
          tags.Format<"date-time"> &
          tags.JsonSchemaPlugin<{
            "x-autobe-prisma-schema": "shopping_mall_notification_templates";
          }>)
      : null,
    type: props.body
      .type satisfies IShoppingMallNotificationTemplate["type"] as IShoppingMallNotificationTemplate["type"],
    language: props.body
      .language satisfies IShoppingMallNotificationTemplate["language"] as IShoppingMallNotificationTemplate["language"],
  };
}
