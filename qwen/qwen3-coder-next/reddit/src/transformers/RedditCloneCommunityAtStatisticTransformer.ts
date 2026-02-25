import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneCommunityAtStatisticTransformer {
  export type Payload = Prisma.reddit_clone_communitiesGetPayload<{
    select: {
      id: boolean;
      name: boolean;
      description: boolean;
      icon_url: boolean;
      owner_id: boolean;
      subscriber_count: boolean;
      owner: {
        select: {
          username: boolean;
        };
      };
    };
  }>;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        owner_id: true,
        subscriber_count: true,
        owner: {
          select: {
            username: true,
          },
        },
      },
    } satisfies Prisma.reddit_clone_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunity.IStatistic> {
    return {
      community: {
        id: input.id,
        name: input.name,
        description: input.description ?? "",
        icon_url: input.icon_url ?? "",
        owner_id: input.owner_id,
        owner_username: input.owner.username,
      },
      name: input.name,
      description: input.description ?? "",
      icon_url: input.icon_url ?? "",
      owner_id: input.owner_id,
      owner_username: input.owner.username,
      subscriber_count: input.subscriber_count ?? 0,
      post_count: 0,
      comment_count: 0,
      vote_count: 0,
      engagement_rate: 0,
      activity_score: 0,
    };
  }
}
