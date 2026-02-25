import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallNotificationTemplateAtSummaryTransformer } from "./ShoppingMallNotificationTemplateAtSummaryTransformer";

export namespace ShoppingMallUserNotificationTransformer {
  export type Payload = Prisma.shopping_mall_user_notificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        owner_type: true,
        title: true,
        body: true,
        url: true,
        image_url: true,
        is_read: true,
        delivered_at: true,
        read_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        notification_template_id: true,
        owner_id: true,
        notificationTemplate:
          ShoppingMallNotificationTemplateAtSummaryTransformer.select(),
        owner: ShoppingMallCustomerAtSummaryTransformer.select(),
        notificationDeliveries: true,
        logs: true,
      },
    } satisfies Prisma.shopping_mall_user_notificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallUserNotification> {
    return {
      id: input.id,
      notificationTemplate:
        await ShoppingMallNotificationTemplateAtSummaryTransformer.transform(
          input.notificationTemplate,
        ),
      notification_template_id: input.notification_template_id,
      owner: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.owner,
      ),
      owner_id: input.owner_id,
      owner_type: input.owner_type,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      image_url: input.image_url ?? null,
      is_read: input.is_read,
      delivered_at: input.delivered_at
        ? input.delivered_at.toISOString()
        : null,
      read_at: input.read_at ? input.read_at.toISOString() : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
