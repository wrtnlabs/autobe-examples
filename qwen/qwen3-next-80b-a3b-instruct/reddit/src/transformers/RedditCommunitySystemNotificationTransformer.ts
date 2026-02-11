import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunitySystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemNotification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunitySystemNotificationTransformer {
  export type Payload = Prisma.reddit_community_system_notificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        message: true,
        created_at: true,
        delivered_at: true,
      },
    } satisfies Prisma.reddit_community_system_notificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunitySystemNotification> {
    return {
      id: input.id,
      message: input.message,
      created_at: input.created_at.toISOString(),
      delivered_at: input.delivered_at?.toISOString() ?? null,
    };
  }
}
