import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSystemNotificationTransformer {
  // 1. Payload type first
  export type Payload = Prisma.discussion_board_system_notificationsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        notification_type: true,
        status: true,
        priority: true,
        target_entity_type: true,
        target_entity_id: true,
        expires_at: true,
        delivered_at: true,
        read_at: true,
      },
    } satisfies Prisma.discussion_board_system_notificationsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemNotification> {
    return {
      id: input.id,
      title: input.title,
      content: input.content,
      notification_type: input.notification_type,
      status: input.status,
      priority: input.priority,
      target_entity_type: input.target_entity_type ?? null,
      target_entity_id: input.target_entity_id ?? null,
      expires_at: input.expires_at?.toISOString() ?? null,
      delivered_at: input.delivered_at?.toISOString() ?? null,
      read_at: input.read_at?.toISOString() ?? null,
    };
  }
}
