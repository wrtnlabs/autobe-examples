import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneCommunityModeratorTransformer {
  export type Payload = Prisma.reddit_clone_community_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community_id: true,
        moderator_id: true,
        appointer_id: true,
        appointed_at: true,
        appointment_reason: true,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            created_at: true,
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
              },
            } satisfies Prisma.reddit_clone_ownersFindFirstArgs,
          },
        } satisfies Prisma.reddit_clone_communitiesFindFirstArgs,
        moderator: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            role_type: true,
            permissions: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            last_login_at: true,
          },
        } satisfies Prisma.reddit_clone_membersFindFirstArgs,
        appointer: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        } satisfies Prisma.reddit_clone_ownersFindFirstArgs,
      },
    } satisfies Prisma.reddit_clone_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityModerator> {
    return {
      id: input.id,
      community_id: input.community_id,
      moderator_id: input.moderator_id,
      appointer_id: input.appointer_id,
      appointed_at: input.appointed_at.toISOString(),
      appointment_reason: input.appointment_reason ?? undefined,
      community: {
        id: input.community.id,
        name: input.community.name,
        description: input.community.description ?? undefined,
        iconUrl: input.community.icon_url ?? undefined,
        subscriberCount: input.community.subscriber_count,
        createdAt: input.community.created_at.toISOString(),
        owner: {
          id: input.community.owner.id,
          username: input.community.owner.username,
          displayName: input.community.owner.display_name ?? undefined,
          avatarUrl: input.community.owner.avatar_url ?? undefined,
        },
      } satisfies IRedditCloneCommunity.ISummary,
      moderator: {
        id: input.moderator.id,
        email: input.moderator.email,
        username: input.moderator.username,
        displayName: input.moderator.display_name ?? undefined,
        bio: input.moderator.bio ?? undefined,
        avatarUrl: input.moderator.avatar_url ?? undefined,
        roleType: input.moderator.role_type,
        permissions: input.moderator.permissions,
        createdAt: input.moderator.created_at.toISOString(),
        updatedAt: input.moderator.updated_at.toISOString(),
        deletedAt: input.moderator.deleted_at?.toISOString() ?? undefined,
        lastLoginAt: input.moderator.last_login_at?.toISOString() ?? undefined,
      } satisfies IRedditCloneModerator.ISummary,
      appointer: {
        id: input.appointer.id,
        username: input.appointer.username,
        displayName: input.appointer.display_name ?? undefined,
        avatarUrl: input.appointer.avatar_url ?? undefined,
      } satisfies IRedditCloneOwner.ISummary,
    };
  }
}
