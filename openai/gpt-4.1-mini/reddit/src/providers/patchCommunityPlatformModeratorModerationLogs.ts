import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorModerationLogs(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerationLog.IRequest;
}): Promise<IPageICommunityPlatformModerationLog.ISummary> {
  const {
    moderatorId,
    actionType,
    postId,
    commentId,
    createdAtFrom,
    createdAtTo,
    updatedAtFrom,
    updatedAtTo,
    page = 1,
    limit = 20,
    sortBy = "created_at",
  } = props.body;
  if (page < 1) {
    throw new HttpException("Invalid page number, must be >= 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Invalid limit, must be between 1 and 100", 400);
  }
  const where: Prisma.community_platform_moderation_logsWhereInput = {};
  if (moderatorId !== undefined) where.moderator_id = moderatorId;
  if (actionType !== undefined) where.action_type = actionType;
  if (postId !== undefined) where.post_id = postId;
  if (commentId !== undefined) where.comment_id = commentId;
  if (createdAtFrom !== undefined || createdAtTo !== undefined) {
    where.created_at = {};
    if (createdAtFrom !== undefined) where.created_at.gte = createdAtFrom;
    if (createdAtTo !== undefined) where.created_at.lte = createdAtTo;
  }
  if (updatedAtFrom !== undefined || updatedAtTo !== undefined) {
    where.updated_at = {};
    if (updatedAtFrom !== undefined) where.updated_at.gte = updatedAtFrom;
    if (updatedAtTo !== undefined) where.updated_at.lte = updatedAtTo;
  }
  const validSortFields = ["created_at", "updated_at"] as const;
  if (!validSortFields.includes(sortBy)) {
    throw new HttpException(`Invalid sortBy value: ${sortBy}`, 400);
  }
  const orderBy: Prisma.community_platform_moderation_logsOrderByWithRelationInput =
    {
      [sortBy]: "desc",
    };
  const skip = (page - 1) * limit;
  const logs =
    await MyGlobal.prisma.community_platform_moderation_logs.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        action_type: true,
        action_details: true,
        moderator_id: true,
        post_id: true,
        comment_id: true,
        created_at: true,
        updated_at: true,
      },
    });
  const moderatorIds = logs
    .map((log) => log.moderator_id)
    .filter((id): id is string => id !== null);
  const moderators =
    await MyGlobal.prisma.community_platform_moderators.findMany({
      where: { id: { in: moderatorIds } },
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_url: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const moderatorMap = new Map(moderators.map((m) => [m.id, m]));
  const postIds = logs
    .map((log) => log.post_id)
    .filter((id): id is string => id !== null);
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: { id: { in: postIds } },
    select: {
      id: true,
      title: true,
      post_type: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      community_id: true,
    },
  });
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const commentIds = logs
    .map((log) => log.comment_id)
    .filter((id): id is string => id !== null);
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where: { id: { in: commentIds } },
    select: {
      id: true,
      content: true,
      is_deleted: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      user_id: true,
    },
  });
  const commentMap = new Map(comments.map((c) => [c.id, c]));
  const total = await MyGlobal.prisma.community_platform_moderation_logs.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(logs, async (log) => {
      const moderator = log.moderator_id
        ? (moderatorMap.get(log.moderator_id) ?? null)
        : null;
      const post = log.post_id ? (postMap.get(log.post_id) ?? null) : null;
      const comment = log.comment_id
        ? (commentMap.get(log.comment_id) ?? null)
        : null;
      return {
        id: log.id,
        actionType: log.action_type,
        actionDetails: log.action_details ?? null,
        moderator: moderator
          ? ({
              id: moderator.id,
              username: moderator.username,
              displayName: moderator.display_name ?? null,
              avatarUrl: moderator.avatar_url ?? null,
              karma: moderator.karma,
              createdAt: toISOStringSafe(moderator.created_at),
              updatedAt: toISOStringSafe(moderator.updated_at),
              deletedAt: moderator.deleted_at
                ? toISOStringSafe(moderator.deleted_at)
                : null,
            } satisfies ICommunityPlatformModerator.ISummary)
          : undefined,
        post: post
          ? ({
              id: post.id,
              title: post.title,
              postType: post.post_type,
              createdAt: toISOStringSafe(post.created_at),
              updatedAt: toISOStringSafe(post.updated_at),
              deletedAt: post.deleted_at
                ? toISOStringSafe(post.deleted_at)
                : null,
              communityId: post.community_id,
            } satisfies ICommunityPlatformPost.ISummary)
          : undefined,
        comment: comment
          ? ({
              id: comment.id,
              content: comment.content,
              isDeleted: comment.is_deleted,
              createdAt: toISOStringSafe(comment.created_at),
              updatedAt: toISOStringSafe(comment.updated_at),
              author: comment.user_id,
              deletedAt: comment.deleted_at
                ? toISOStringSafe(comment.deleted_at)
                : null,
            } satisfies ICommunityPlatformComment.ISummary)
          : undefined,
        createdAt: toISOStringSafe(log.created_at),
        updatedAt: toISOStringSafe(log.updated_at),
      } satisfies ICommunityPlatformModerationLog.ISummary;
    }),
  } satisfies IPageICommunityPlatformModerationLog.ISummary;
}
