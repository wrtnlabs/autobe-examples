import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformMemberTransformer {
  export type Payload = Prisma.community_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        nickname: true,
        email_verified: true,
        registered_at: true,
        last_login_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        sessions: true,
        passwordResets: true,
        memberEmailVerifications: true,
        createdMetadata: true,
        updatedMetadata: true,
        systemNotifications: true,
        tempUploads: true,
        memberAuditLogLinks: true,
        ownedCommunities: true,
        moderationRoles: true,
        assignedModerationRoles: true,
        receivedBans: true,
        memberSubscriptions: true,
        subscriptionActivities: true,
        posts: CommunityPlatformPostAtSummaryTransformer.select(),
        comments: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            author: CommunityPlatformMemberAtSummaryTransformer.select(),
            post: CommunityPlatformPostAtSummaryTransformer.select(),
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
        editedCommentSnapshots: true,
        postVotes: true,
        commentVotes: true,
        karma: {
          select: {
            score: true,
          },
        } satisfies Prisma.community_platform_karmasFindManyArgs,
        postVoteSnapshots: true,
        commentVoteSnapshots: true,
        contentReportsSubmitteds: true,
        reportApprovals: true,
        userReports: true,
        reportDismissals: true,
      },
    } satisfies Prisma.community_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMember> {
    return {
      id: input.id,
      username: input.username,
      nickname: input.nickname ?? null,
      email: input.email,
      email_verified: input.email_verified,
      registered_at: input.registered_at.toISOString(),
      last_login_at: input.last_login_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      avatar: null, // TODO: Resolve avatar from files table
      karma: input.karma?.score ?? 0,
      posts: await ArrayUtil.asyncMap(
        input.posts,
        CommunityPlatformPostAtSummaryTransformer.transform,
      ),
      comments: await ArrayUtil.asyncMap(
        input.comments,
        async (comment) =>
          ({
            id: comment.id,
            content: comment.content,
            voteScore: comment.vote_score,
            createdAt: comment.created_at.toISOString(),
            updatedAt: comment.updated_at.toISOString(),
            deletedAt: comment.deleted_at?.toISOString() ?? null,
            author: await CommunityPlatformMemberAtSummaryTransformer.transform(
              comment.author,
            ),
            post: await CommunityPlatformPostAtSummaryTransformer.transform(
              comment.post,
            ),
          }) satisfies ICommunityPlatformComment.ISummary,
      ),
    };
  }
}
