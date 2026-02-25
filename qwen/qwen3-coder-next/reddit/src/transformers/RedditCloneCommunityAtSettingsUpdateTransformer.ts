import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneCommunityAtSettingsUpdateTransformer {
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
            email: true,
          },
        },
        subscriptionCommunities: {
          select: {
            id: true,
            created_at: true,
          },
        },
        redditCloneOwner: {
          select: {
            id: true,
          },
        },
        redditCloneCommunityModerators: {
          select: {
            id: true,
          },
        },
        redditCloneCommunityBans: {
          select: {
            id: true,
          },
        },
        posts: {
          select: {
            id: true,
            title: true,
          },
        },
        contentSubscriptionCommunities: {
          select: {
            id: true,
          },
        },
        redditCloneModeratorAssignments: {
          select: {
            id: true,
          },
        },
        redditCloneBanRecords: {
          select: {
            id: true,
            reason: true,
          },
        },
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunity.ISettingsUpdate> {
    return {
      name: input.name,
      description: input.description ?? undefined,
      icon_url: input.icon_url ?? undefined,
      privacy: "public",
    };
  }
}
