import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityRateLimitCounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRateLimitCounter";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityRateLimitCounterAtSummaryTransformer {
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
        member: RedditCommunityMemberAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_community_rate_limit_countersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityRateLimitCounter.ISummary> {
    return {
      id: input.id,
      member: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      endpoint: input.endpoint,
      request_count: input.request_count,
      window_start: input.window_start.toISOString(),
      window_end: input.window_end.toISOString(),
    };
  }
}
