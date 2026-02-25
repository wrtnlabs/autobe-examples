import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallUserNotificationPreferenceTransformer {
  export type Payload =
    Prisma.shopping_mall_user_notification_preferencesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        customer: { select: { id: true } },
        seller: { select: { id: true } },
        administrator: { select: { id: true } },
        channel_name: true,
        notification_type: true,
        is_enabled: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_user_notification_preferencesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallUserNotificationPreference> {
    return {
      id: input.id,
      customerId: input.customer?.id ?? undefined,
      sellerId: input.seller?.id ?? undefined,
      administratorId: input.administrator?.id ?? undefined,
      channelName: input.channel_name,
      notificationType: input.notification_type,
      isEnabled: input.is_enabled,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
