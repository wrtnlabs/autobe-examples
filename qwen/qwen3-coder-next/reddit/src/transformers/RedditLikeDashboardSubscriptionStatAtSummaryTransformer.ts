import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeDashboardSubscriptionStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeDashboardSubscriptionStat";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeDashboardSubscriptionStatAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: true,
        community: true,
      },
    } satisfies Prisma.reddit_like_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IRedditLikeDashboardSubscriptionStat.ISummary> {
    return {
      total_subscriptions: input.length,
      subscribed_count: input.filter((item) => item.status === "subscribed")
        .length,
    };
  }
}
