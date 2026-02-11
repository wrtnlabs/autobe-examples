import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityCommunityAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        subscriber_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: true,
      },
    } satisfies Prisma.reddit_community_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      icon_url: input.icon_url ?? null,
      subscriber_count: Number(input.subscriber_count),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
