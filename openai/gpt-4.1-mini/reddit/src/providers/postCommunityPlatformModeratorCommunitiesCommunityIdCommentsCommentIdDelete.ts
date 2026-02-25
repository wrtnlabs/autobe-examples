import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdCommentsCommentIdDelete(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  const { moderator, communityId, commentId } = props;
  // Validate moderator membership in community
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: communityId,
        id: moderator.id,
        deleted_at: null,
      },
    });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Load comment and relations
  const commentRaw =
    await MyGlobal.prisma.community_platform_comments.findUnique({
      where: { id: commentId },
      include: {
        post: { select: { community_id: true } },
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            comments: true,
            posts: true,
            bans: true,
            bannedUsers: true,
            password_hash: true,
            sessions: true,
            passwordResets: true,
            emailVerifications: true,
            activityLogs: true,
            ownedCommunities: true,
            communitySubscriptions: true,
            communityBans: true,
            postVotes: true,
            postComments: true,
            commentVotes: true,
            postReports: true,
            commentReports: true,
            deletedContents: true,
            reports: true,
          },
        },
        parent: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        children: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  if (commentRaw === null || commentRaw.post.community_id !== communityId) {
    throw new HttpException("Not Found", 404);
  }
  function formatDate(date: Date | null): string | null {
    return date === null ? null : toISOStringSafe(date);
  }
  function transformUserSummary(user: any): ICommunityPlatformUser.ISummary {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      karma: user.karma,
      createdAt: formatDate(user.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: formatDate(user.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: formatDate(user.deleted_at) as
        | (string & tags.Format<"date-time">)
        | null,
    };
  }
  function transformSummary(
    comment: any,
  ): ICommunityPlatformComment.ISummary | null {
    if (comment === null) return null;
    return {
      id: comment.id,
      content: comment.content,
      createdAt: formatDate(comment.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: formatDate(comment.updated_at) as string &
        tags.Format<"date-time">,
      postId: comment.post_id,
      userId: comment.user_id,
      parentId: comment.parent_id === undefined ? null : comment.parent_id,
      isDeleted: comment.is_deleted,
    };
  }
  function transformComment(comment: any): ICommunityPlatformComment {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: formatDate(comment.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: formatDate(comment.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: formatDate(comment.deleted_at) as
        | (string & tags.Format<"date-time">)
        | null,
      parentId: comment.parent_id,
      isDeleted: comment.is_deleted,
      user: transformUserSummary(comment.user),
      post: { communityId: comment.post.community_id },
      parent: comment.parent ? transformSummary(comment.parent) : null,
      children: comment.children.map((child: any) => ({
        ...transformSummary(child),
        user: child.user ? transformUserSummary(child.user) : undefined,
      })),
    } satisfies ICommunityPlatformComment;
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_comments.delete({ where: { id: commentId } });
    await tx.community_platform_deleted_contents.create({
      data: {
        id: v4(),
        moderator_id: moderator.id,
        comment_id: commentId,
        reason: "deleted by moderator",
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
  });
  const comment = transformComment(commentRaw);
  return await CommunityPlatformCommentTransformer.transform(comment);
}
