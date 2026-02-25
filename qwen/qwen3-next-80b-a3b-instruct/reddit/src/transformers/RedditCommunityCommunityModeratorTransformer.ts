import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityCommunityModeratorTransformer {
  export type Payload = Prisma.reddit_community_community_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        is_deleted: true,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            created_at: true,
            updated_at: true,
            subscribers: {
              select: { id: true },
            },
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma_score: true,
                created_at: true,
              },
            },
          },
        },
        sessions: true,
        passwordReset: true,
        moderatorEmailVerifications: true,
      },
    } satisfies Prisma.reddit_community_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommunityModerator> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      display_name: input.display_name,
      bio: input.bio ?? undefined,
      avatar_url: input.avatar_url ?? undefined,
      karma_score: Number(input.karma_score),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      community_id: input.community.id,
      user: {
        id: input.community.owner.id,
        username: input.community.owner.username,
        display_name: input.community.owner.display_name,
        bio: input.community.owner.bio ?? undefined,
        avatar_url: input.community.owner.avatar_url ?? undefined,
        karma_score: Number(input.community.owner.karma_score),
        created_at: input.community.owner.created_at.toISOString(),
      },
      community: {
        id: input.community.id,
        name: input.community.name,
        description: input.community.description,
        icon_url: input.community.icon_url ?? null,
        subscriber_count: input.community.subscribers.length,
        created_at: input.community.created_at.toISOString(),
        updated_at: input.community.updated_at.toISOString(),
      },
    };
  }
}
