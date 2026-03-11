import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityBanTransformer } from "../transformers/RedditPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityBan.IUnban;
}): Promise<IRedditPlatformCommunityBan> {
  // Step 1: Find and validate the ban record
  const ban =
    await MyGlobal.prisma.reddit_platform_community_bans.findUniqueOrThrow({
      where: {
        id: props.banId,
      },
      include: {
        community: {
          select: {
            id: true,
            owner_id: true,
          },
        },
        bannedUser: {
          select: {
            id: true,
          },
        },
      },
    });
  // Verify ban belongs to the specified community
  if (ban.community.id !== props.communityId) {
    throw new HttpException(
      "Ban record does not belong to specified community",
      400,
    );
  }
  // Step 2: Verify authorization - user must be community owner or moderator
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  const isOwner = community.owner_id === props.member.id;
  const isModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.member.id,
      },
    });
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Update ban record to mark as unbanned (soft delete)
  const unbannedBan =
    await MyGlobal.prisma.reddit_platform_community_bans.update({
      where: {
        id: props.banId,
      },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            posts: true,
            reports: true,
            subscriptions: true,
            moderationAuditLogs: true,
            moderators: true,
            moderatorHistories: true,
            bans: true,
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                karma_score: true,
                is_active: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                email: true,
                bio: true,
                avatar_url: true,
                password_hash: true,
                comments: true,
                sessions: true,
                passwordResetTokens: true,
                emailVerifications: true,
                ownedCommunities: true,
                posts: true,
                memberPostVotes: true,
                postSnapshots: true,
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
            },
          },
        },
        bannedUser: {
          select: {
            id: true,
            username: true,
            display_name: true,
            karma_score: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            email: true,
            bio: true,
            avatar_url: true,
            password_hash: true,
            comments: true,
            sessions: true,
            passwordResetTokens: true,
            emailVerifications: true,
            ownedCommunities: true,
            posts: true,
            memberPostVotes: true,
            postSnapshots: true,
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
        },
      },
    });
  // Step 4: Remove moderator roles if applicable
  const moderatorRole =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: ban.bannedUser.id,
      },
    });
  if (moderatorRole) {
    await MyGlobal.prisma.reddit_platform_community_moderators.delete({
      where: {
        id: moderatorRole.id,
      },
    });
    // Log unban action in moderator history
    await MyGlobal.prisma.reddit_platform_moderator_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_id: props.communityId,
        user_id: ban.bannedUser.id,
        acted_by_id: props.member.id,
        action_type: "UNBANNED",
        notes: props.body.unbanReason,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  // Step 5: Transform and return the updated ban record
  return await RedditPlatformCommunityBanTransformer.transform(unbannedBan);
}
