import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformUserAtSummaryTransformer {
  export type Payload = Prisma.community_platform_usersGetPayload<
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
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        activityLogs: true,
        ownedCommunities: true,
        communitySubscriptions: true,
        posts: true,
        communityBans: true,
        postVotes: true,
        postComments: true,
        commentVotes: true,
        postReports: true,
        commentReports: true,
        comments: true,
        bans: true,
        bannedUsers: true,
        deletedContents: true,
        reports: true,
      },
    } satisfies Prisma.community_platform_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformUser.ISummary> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      displayName: input.display_name,
      bio: input.bio ?? null,
      avatarUrl: input.avatar_url ?? null,
      karma: input.karma,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
