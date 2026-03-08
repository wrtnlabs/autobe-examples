import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeCommunityAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        icon_url: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_like_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      icon_url: input.icon_url,
      created_at: input.created_at.toISOString(),
    };
  }
}
