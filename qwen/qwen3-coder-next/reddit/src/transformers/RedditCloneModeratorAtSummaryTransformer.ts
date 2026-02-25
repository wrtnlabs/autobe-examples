import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneModeratorAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
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
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        redditCloneCommunityBanExecutions: true,
        redditCloneContentReportResolutions: true,
        feedPreference: true,
        redditCloneBanRecords: true,
        moderationLogs: true,
        redditCloneModerationResolvedReports: true,
        redditCloneReportResolutions: true,
      },
    } satisfies Prisma.reddit_clone_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModerator.ISummary> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      displayName: input.display_name ?? undefined,
      bio: input.bio ?? undefined,
      avatarUrl: input.avatar_url ?? undefined,
      roleType: input.role_type,
      permissions: input.permissions,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? undefined,
      lastLoginAt: input.last_login_at?.toISOString() ?? undefined,
    };
  }
}
