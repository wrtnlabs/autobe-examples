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

export namespace ShoppingMallNotificationLogTransformer {
  export type Payload = Prisma.shopping_mall_notification_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        notificationTemplate:
          ShoppingMallNotificationTemplateAtSummaryTransformer.select(),
        userNotification:
          ShoppingMallUserNotificationAtSummaryTransformer.select(),
        notification_template_id: true,
        user_notification_id: true,
        event_type: true,
        event_metadata: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_notification_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallNotificationLog> {
    return {
      id: input.id,
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
      notification_template_id: input.notification_template_id,
      user_notification_id: input.user_notification_id,
      event_type: input.event_type,
      event_metadata: input.event_metadata ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
