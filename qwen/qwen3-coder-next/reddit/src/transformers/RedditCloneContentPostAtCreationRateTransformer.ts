import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneContentPostAtCreationRateTransformer {
  // Payload type first
  export type Payload = Prisma.reddit_clone_content_postsGetPayload<
    ReturnType<typeof select>
  >;
  // select() function second
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        _count: true,
      },
    } satisfies Prisma.reddit_clone_content_postsFindManyArgs;
  }
  // transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneContentPost.ICreationRate> {
    return {
      absolute_growth: 0,
      percentage_change: 0,
      current_period_count: 0,
      previous_period_count: 0,
      growth_rate: 0,
    };
  }
}
