import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSystemNotificationAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_system_notificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        notification_type: true,
        status: true,
        priority: true,
        created_at: true,
        delivered_at: true,
        read_at: true,
      },
    } satisfies Prisma.discussion_board_system_notificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemNotification.ISummary> {
    return {
      id: input.id,
      title: input.title,
      notification_type: input.notification_type,
      status: input.status,
      priority: input.priority,
      created_at: input.created_at.toISOString(),
      delivered_at: input.delivered_at?.toISOString() ?? null,
      read_at: input.read_at?.toISOString() ?? null,
    };
  }
}
