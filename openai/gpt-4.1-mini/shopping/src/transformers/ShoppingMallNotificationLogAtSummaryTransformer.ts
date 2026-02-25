import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallNotificationTemplateAtSummaryTransformer } from "./ShoppingMallNotificationTemplateAtSummaryTransformer";
import { ShoppingMallUserNotificationAtSummaryTransformer } from "./ShoppingMallUserNotificationAtSummaryTransformer";

export namespace ShoppingMallNotificationLogAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_notification_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        event_metadata: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        notificationTemplate:
          ShoppingMallNotificationTemplateAtSummaryTransformer.select(),
        userNotification:
          ShoppingMallUserNotificationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_notification_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallNotificationLog.ISummary> {
    return {
      id: input.id,
      eventType: input.event_type,
      eventMetadata: input.event_metadata ?? null,
      createdAt: input.created_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      notificationTemplate: input.notificationTemplate
        ? await ShoppingMallNotificationTemplateAtSummaryTransformer.transform(
            input.notificationTemplate,
          )
        : null,
      userNotification: input.userNotification
        ? await ShoppingMallUserNotificationAtSummaryTransformer.transform(
            input.userNotification,
          )
        : null,
    };
  }
}
