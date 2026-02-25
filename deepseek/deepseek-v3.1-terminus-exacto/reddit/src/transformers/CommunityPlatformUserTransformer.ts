import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformUserTransformer {
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
        email_verified: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        activities: true,
        auditLogs: true,
        authTokenOfUser: true,
        systemNotificationDeliveries: true,
        ownedCommunities: true,
        communitySubscriptions: true,
        moderatorAssignments: true,
        communityAnnouncements: true,
        sentInvitations: true,
        receivedInvitations: true,
        createdWikiPages: true,
        communityFlairAssignments: true,
        flairAssignmentsGivens: true,
        userPosts: true,
        userPostViews: true,
        postFavorites: true,
        comments: true,
        commentSnapshots: true,
        commentEdits: true,
        postVotes: true,
        commentVotes: true,
        voteKarmaImpacts: true,
        voteRateLimits: true,
        votingTransactions: true,
        communityBans: true,
        moderatorAssignmentsReceiveds: true,
        moderatorAssignmentsMades: true,
        moderationAuditLogs: true,
        moderationActionLogs: true,
      },
    } satisfies Prisma.community_platform_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformUser> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name ?? null,
      bio: input.bio ?? null,
      avatar_url: input.avatar_url ?? null,
      karma: input.karma,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
