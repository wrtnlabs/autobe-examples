import { ICommunityPlatformSystemNotificationBroadcastDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotificationBroadcastDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformSystemNotificationBroadcastDeliveryTransformer {
  export type Payload =
    Prisma.community_platform_system_notification_broadcast_deliveriesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        delivery_status: true,
        total_recipients: true,
        delivered_count: true,
        failed_count: true,
        scheduled_at: true,
        started_at: true,
        completed_at: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        systemNotification: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_system_notificationsFindManyArgs,
      },
    } satisfies Prisma.community_platform_system_notification_broadcast_deliveriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformSystemNotificationBroadcastDelivery> {
    return {
      id: input.id,
      delivery_status: input.delivery_status,
      total_recipients: input.total_recipients,
      delivered_count: input.delivered_count,
      failed_count: input.failed_count,
      scheduled_at: input.scheduled_at?.toISOString() ?? null,
      started_at: input.started_at?.toISOString() ?? null,
      completed_at: input.completed_at?.toISOString() ?? null,
      error_message: input.error_message ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      system_notification_id: input.systemNotification.id,
    };
  }
}
