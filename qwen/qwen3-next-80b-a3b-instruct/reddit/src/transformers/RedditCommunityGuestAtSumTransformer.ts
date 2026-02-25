import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityGuestAtSumTransformer {
  export type Payload = Prisma.reddit_community_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        device_id: true,
        session_token: true,
        ip_address: true,
        user_agent: true,
        last_activity_at: true,
        guestSessions: true,
      },
    } satisfies Prisma.reddit_community_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityGuest.ISum> {
    return {
      username: input.device_id,
      display_name: input.user_agent.includes("iPhone")
        ? "iOS Device"
        : input.user_agent.includes("Android")
          ? "Android Device"
          : input.user_agent.includes("Chrome")
            ? "Chrome Browser"
            : input.user_agent.includes("Firefox")
              ? "Firefox Browser"
              : input.user_agent.includes("Safari")
                ? "Safari Browser"
                : "Unknown Device",
      karma_score: 0, // Computed from external activity logs, not stored in DB
    };
  }
}
