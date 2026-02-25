import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneModerationLogAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_moderation_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        moderator_id: true,
        post_id: true,
        comment_id: true,
        action_type: true,
        target_type: true,
        reason: true,
        created_at: true,
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
        } satisfies Prisma.reddit_clone_moderatorsFindFirstArgs,
        post: {
          select: {
            id: true,
            type: true,
            title: true,
            content: true,
            image_url: true,
            vote_score: true,
            comment_count: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            author_id: true,
            community_id: true,
          },
        } satisfies Prisma.reddit_clone_content_postsFindFirstArgs,
        comment: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            reply_count: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            member_id: true,
            post_id: true,
            parent_comment_id: true,
          },
        } satisfies Prisma.reddit_clone_content_commentsFindFirstArgs,
      },
    } satisfies Prisma.reddit_clone_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModerationLog.ISummary> {
    return {
      id: input.id,
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
      },
      target:
        input.target_type === "post"
          ? input.post
            ? {
                id: input.post.id,
                title: input.post.title,
                author: {
                  id: input.post.author_id,
                  username: "", // Would need to fetch author separately
                  displayName: undefined,
                  avatarUrl: undefined,
                },
                community: {
                  id: input.post.community_id,
                  name: "", // Would need to fetch community separately
                  description: undefined,
                  iconUrl: undefined,
                  subscriberCount: 0,
                  createdAt: "", // Would need to fetch community separately
                  owner: {
                    id: "", // Would need to fetch community owner separately
                    username: "",
                    displayName: undefined,
                    avatarUrl: undefined,
                  },
                },
                voteScore: input.post.vote_score,
                commentCount: input.post.comment_count,
                viewCount: 0,
                upvoteCount: 0,
                downvoteCount: 0,
                timeAgo: "",
                trendingScore: 0,
                engagementRate: 0,
                created_at: input.post.created_at.toISOString(),
              }
            : null
          : input.target_type === "comment"
            ? input.comment
              ? {
                  id: input.comment.id,
                  content: input.comment.content,
                  author: {
                    id: input.comment.member_id,
                    username: "", // Would need to fetch member separately
                    displayName: undefined,
                    avatarUrl: undefined,
                  },
                  voteScore: input.comment.vote_score,
                  replyCount: input.comment.reply_count,
                  createdAt: input.comment.created_at.toISOString(),
                }
              : null
            : null,
      targetType: input.target_type as "post" | "comment",
      actionType: input.action_type as
        | "delete_post"
        | "delete_comment"
        | "ban_user"
        | "unban_user"
        | "approve_report"
        | "dismiss_report",
      reason: input.reason ?? undefined,
      createdAt: input.created_at.toISOString(),
    };
  }
}
