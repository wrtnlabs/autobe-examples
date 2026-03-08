import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformMemberTransformer {
  export type Payload = Prisma.reddit_platform_membersGetPayload<
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
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResetTokens: true,
        emailVerifications: true,
        ownedCommunities: true,
        posts: true,
        memberPostVotes: true,
        postSnapshots: true,
        comments: true,
        commentVotes: true,
        reports: true,
        resolvedReports: true,
        subscriptions: true,
        moderatorOfCommunities:
          RedditPlatformCommunityAtSummaryTransformer.select(),
        moderationAuditLogs: true,
        userModerationAuditLogs: true,
        moderatorHistoryRecords: true,
        moderatorHistoryActions: true,
        bannedUsers: RedditPlatformMemberAtSummaryTransformer.select(),
        issuedBans: true,
      },
    } satisfies Prisma.reddit_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMember> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      displayName: input.display_name,
      bio: input.bio ?? null,
      avatarUrl: input.avatar_url ?? null,
      karmaScore: input.karma_score,
      isActive: input.is_active,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      moderatorOfCommunities: await ArrayUtil.asyncMap(
        input.moderatorOfCommunities,
        RedditPlatformCommunityAtSummaryTransformer.transform,
      ),
      bannedUsers: await ArrayUtil.asyncMap(
        input.bannedUsers,
        RedditPlatformMemberAtSummaryTransformer.transform,
      ),
    };
  }
}
