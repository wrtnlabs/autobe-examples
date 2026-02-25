import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneOwnerAtSummaryTransformer } from "./RedditCloneOwnerAtSummaryTransformer";

export namespace RedditCloneCommunityAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_communitiesGetPayload<
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
        owner: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        } satisfies Prisma.reddit_clone_ownersFindFirstArgs,
        subscriptionCommunities: true,
        redditCloneOwner: true,
        redditCloneCommunityModerators: true,
        redditCloneCommunityBans: true,
        posts: true,
        contentSubscriptionCommunities: true,
        redditCloneModeratorAssignments: true,
        redditCloneBanRecords: true,
      },
    } satisfies Prisma.reddit_clone_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      iconUrl: input.icon_url ?? undefined,
      subscriberCount: input.subscriber_count,
      createdAt: input.created_at.toISOString(),
      owner: await RedditCloneOwnerAtSummaryTransformer.transform(input.owner),
    };
  }
}
