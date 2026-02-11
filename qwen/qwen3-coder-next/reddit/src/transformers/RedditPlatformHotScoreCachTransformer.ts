import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformHotScoreCach } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformHotScoreCach";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformHotScoreCachTransformer {
  export type Payload = Prisma.reddit_platform_hot_score_cachesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target: { select: { id: true } },
        hot_score: true,
        calculated_at: true,
      },
    } satisfies Prisma.reddit_platform_hot_score_cachesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformHotScoreCach> {
    return {
      id: input.id,
      target_id: input.target.id,
      hot_score: input.hot_score,
      calculated_at: input.calculated_at.toISOString(),
    };
  }
}
