import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityRateLimitCounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRateLimitCounter";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityRateLimitCounterTransformer {
  export type Payload = Prisma.reddit_community_rate_limit_countersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        endpoint: true,
        request_count: true,
        window_start: true,
        window_end: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_rate_limit_countersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityRateLimitCounter> {
    return {
      id: input.id,
      endpoint: input.endpoint,
      requestCount: Number(input.request_count),
      windowStart: input.window_start.toISOString(),
      windowEnd: input.window_end.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      member: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
