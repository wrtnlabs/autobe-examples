import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallUserNotificationAtSummaryTransformer {
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
        notificationTemplate: {
          select: { id: true },
        },
        owner: {
          select: { id: true },
        },
        notificationDeliveries: {
          select: {},
        },
        logs: {
          select: {},
        },
      },
    } satisfies Prisma.shopping_mall_user_notificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallUserNotification.ISummary> {
    return {
      id: input.id,
      ownerType: input.owner_type,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      imageUrl: input.image_url ?? null,
      isRead: input.is_read,
      deliveredAt: input.delivered_at?.toISOString() ?? null,
      readAt: input.read_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      notificationTemplateId: input.notificationTemplate.id,
    };
  }
}
