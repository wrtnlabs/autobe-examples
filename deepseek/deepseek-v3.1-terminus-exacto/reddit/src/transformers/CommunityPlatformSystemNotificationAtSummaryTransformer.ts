import { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformSystemNotificationAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_system_notificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        notification_type: true,
        title: true,
        priority: true,
        status: true,
        is_broadcast: true,
        created_at: true,
      },
    } satisfies Prisma.community_platform_system_notificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformSystemNotification.ISummary> {
    return {
      id: input.id,
      notification_type: input.notification_type,
      title: input.title,
      priority: input.priority,
      status: input.status,
      is_broadcast: input.is_broadcast,
      created_at: input.created_at.toISOString(),
    };
  }
}
