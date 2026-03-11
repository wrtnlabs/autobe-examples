import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformPostEngagementStatTransformer {
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
        moderatorOfCommunities: true,
        moderationAuditLogs: true,
        userModerationAuditLogs: true,
        moderatorHistoryRecords: true,
        moderatorHistoryActions: true,
        bannedUsers: true,
        issuedBans: true,
      },
    } satisfies Prisma.reddit_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostEngagementStat> {
    return {
      id: input.id,
      karma_score: input.karma_score,
    };
  }
}
