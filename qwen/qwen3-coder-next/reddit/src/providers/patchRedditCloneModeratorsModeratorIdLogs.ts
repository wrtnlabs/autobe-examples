import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationLog";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModeratorsModeratorIdLogs(props: {
  moderatorId: string;
}): Promise<IPageIRedditCloneModerationLog.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_clone_moderation_logs.findMany({
      where: { moderator_id: props.moderatorId },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: {
        moderator: true,
        post: true,
        comment: true,
      },
    }),
    MyGlobal.prisma.reddit_clone_moderation_logs.count({
      where: { moderator_id: props.moderatorId },
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((log) => ({
      id: log.id as string & tags.Format<"uuid">,
      moderator: {
        id: log.moderator.id as string & tags.Format<"uuid">,
        email: log.moderator.email,
        username: log.moderator.username,
        displayName: log.moderator.display_name,
        bio: log.moderator.bio,
        avatarUrl: log.moderator.avatar_url,
        roleType: log.moderator.role_type,
        permissions: log.moderator.permissions,
        createdAt: toISOStringSafe(log.moderator.created_at),
        updatedAt: toISOStringSafe(log.moderator.updated_at),
        deletedAt: log.moderator.deleted_at
          ? toISOStringSafe(log.moderator.deleted_at)
          : null,
        lastLoginAt: log.moderator.last_login_at
          ? toISOStringSafe(log.moderator.last_login_at)
          : null,
      } satisfies IRedditCloneModerator.ISummary,
      target:
        log.target_type === "post" && log.post
          ? ({
              id: log.post.id as string & tags.Format<"uuid">,
              title: log.post.title,
              author: {
                id: log.post.author_id as string & tags.Format<"uuid">,
                username: log.post.author_id as string,
                displayName: null,
                avatarUrl: null,
              } satisfies IRedditCloneMember.ISummary,
              community: {
                id: log.post.community_id as string & tags.Format<"uuid">,
                name: log.post.community_id as string,
                description: null,
                iconUrl: null,
                subscriberCount: 0,
                createdAt: toISOStringSafe(log.post.created_at),
                owner: {
                  id: log.post.community_id as string & tags.Format<"uuid">,
                  username: log.post.community_id as string,
                  displayName: null,
                  avatarUrl: null,
                } satisfies IRedditCloneOwner.ISummary,
              } satisfies IRedditCloneCommunity.ISummary,
              voteScore: log.post.vote_score,
              commentCount: log.post.comment_count,
              viewCount: 0,
              upvoteCount: 0,
              downvoteCount: 0,
              timeAgo: "0 minutes",
              trendingScore: 0,
              engagementRate: 0,
              created_at: toISOStringSafe(log.post.created_at),
            } satisfies IRedditCloneContentPost.ISummary)
          : log.target_type === "comment" && log.comment
            ? ({
                id: log.comment.id as string & tags.Format<"uuid">,
                content: log.comment.content,
                author: {
                  id: log.comment.member_id as string & tags.Format<"uuid">,
                  username: log.comment.member_id as string,
                  displayName: null,
                  avatarUrl: null,
                } satisfies IRedditCloneMember.ISummary,
                voteScore: log.comment.vote_score,
                replyCount: log.comment.reply_count,
                createdAt: toISOStringSafe(log.comment.created_at),
              } satisfies IRedditCloneContentComment.ISummary)
            : null,
      targetType: log.target_type as "post" | "comment",
      actionType: log.action_type as
        | "delete_post"
        | "delete_comment"
        | "ban_user"
        | "unban_user"
        | "approve_report"
        | "dismiss_report",
      reason: log.reason ?? undefined,
      createdAt: toISOStringSafe(log.created_at),
    })),
  };
}
