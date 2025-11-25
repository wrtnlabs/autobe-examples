import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function getShoppingMallNotificationsTemplatesTemplateId(props: {
  templateId: string;
}): Promise<IShoppingMallNotificationTemplate> {
  const template =
    await MyGlobal.prisma.shopping_mall_notification_templates.findUnique({
      where: { id: props.templateId },
    });

  if (!template) {
    throw new HttpException("Notification template not found", 404);
  }

  return {
    id: template.id,
    title: template.title,
    subject: template.subject,
    body: template.body,
    type: typia.assert<
      | "order_confirmed"
      | "payment_failed"
      | "seller_approved"
      | "seller_rejected"
      | "new_order"
      | "order_shipped"
      | "order_delivered"
      | "review_submitted"
      | "review_response"
      | "notification_alert"
      | "account_verification"
      | "password_reset"
      | "loyalty_point_earned"
      | "coupon_applied"
    >(template.type),
    language: typia.assert<
      "en" | "ko" | "es" | "ja" | "fr" | "de" | "it" | "pt" | "ru" | "zh"
    >(template.language),
    active: template.active,
    createdAt: toISOStringSafe(template.created_at) satisfies string as string,
    updatedAt: template.updated_at
      ? (toISOStringSafe(template.updated_at) satisfies string as string)
      : undefined,
    deletedAt:
      template.deleted_at === null
        ? null
        : (toISOStringSafe(template.deleted_at) satisfies string as string),
  };
}
