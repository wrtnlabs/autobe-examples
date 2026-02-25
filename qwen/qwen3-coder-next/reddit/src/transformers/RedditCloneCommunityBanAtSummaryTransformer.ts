import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneCommunityBanAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ban_reason: true,
        ban_start_date: true,
        ban_end_date: true,
        appeal_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
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
        },
      },
    } satisfies Prisma.reddit_clone_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityBan.ISummary> {
    return {
      id: input.id,
      user: input.user,
      moderator: {
        id: input.moderator.id,
        email: input.moderator.email,
        username: input.moderator.username,
        displayName: input.moderator.display_name,
        bio: input.moderator.bio,
        avatarUrl: input.moderator.avatar_url,
        roleType: input.moderator
          .role_type as IRedditCloneModerator.ISummary["roleType"],
        permissions: input.moderator.permissions,
        createdAt: toISOStringSafe(input.moderator.created_at),
        updatedAt: toISOStringSafe(input.moderator.updated_at),
        deletedAt: input.moderator.deleted_at
          ? toISOStringSafe(input.moderator.deleted_at)
          : null,
        lastLoginAt: input.moderator.last_login_at
          ? toISOStringSafe(input.moderator.last_login_at)
          : null,
      },
      banReason: input.ban_reason,
      banStartDate: toISOStringSafe(input.ban_start_date),
      banEndDate: input.ban_end_date
        ? toISOStringSafe(input.ban_end_date)
        : null,
      appealStatus:
        input.appeal_status as IRedditCloneCommunityBan.ISummary["appealStatus"],
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    };
  }
}
