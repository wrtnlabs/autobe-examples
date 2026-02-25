import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallNotificationTemplateAtSummaryTransformer } from "./ShoppingMallNotificationTemplateAtSummaryTransformer";
import { ShoppingMallUserNotificationAtSummaryTransformer } from "./ShoppingMallUserNotificationAtSummaryTransformer";

export namespace ShoppingMallNotificationDeliveryAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_notification_deliveriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        channel: true,
        status: true,
        attempted_at: true,
        delivered_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        userNotification:
          ShoppingMallUserNotificationAtSummaryTransformer.select(),
        notificationTemplate:
          ShoppingMallNotificationTemplateAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_notification_deliveriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallNotificationDelivery.ISummary> {
    return {
      id: input.id,
      channel: input.channel,
      status: input.status,
      attemptedAt: input.attempted_at.toISOString(),
      deliveredAt: input.delivered_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      notificationTemplate:
        await ShoppingMallNotificationTemplateAtSummaryTransformer.transform(
          input.notificationTemplate,
        ),
      userNotification:
        await ShoppingMallUserNotificationAtSummaryTransformer.transform(
          input.userNotification,
        ),
    };
  }
}
