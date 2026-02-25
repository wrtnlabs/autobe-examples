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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminModerationLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationLog.IRequest;
}): Promise<IPageICommunityPlatformModerationLog.ISummary> {
  const { body } = props;
  const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit >= 1 && body.limit <= 100
      ? body.limit
      : 20;
  const where: Prisma.community_platform_moderation_logsWhereInput = {
    moderator_id: body.moderatorId ?? undefined,
    action_type: body.actionType ?? undefined,
    post_id: body.postId ?? undefined,
    comment_id: body.commentId ?? undefined,
    created_at:
      body.createdAtFrom || body.createdAtTo
        ? {
            ...(body.createdAtFrom ? { gte: body.createdAtFrom } : {}),
            ...(body.createdAtTo ? { lte: body.createdAtTo } : {}),
          }
        : undefined,
    updated_at:
      body.updatedAtFrom || body.updatedAtTo
        ? {
            ...(body.updatedAtFrom ? { gte: body.updatedAtFrom } : {}),
            ...(body.updatedAtTo ? { lte: body.updatedAtTo } : {}),
          }
        : undefined,
  };
  const orderBy = {} as Record<string, "asc" | "desc">;
  if (body.sortBy === "created_at" || body.sortBy === "updated_at") {
    orderBy[body.sortBy] = "desc";
  } else {
    orderBy["created_at"] = "desc";
  }
  const total = await MyGlobal.prisma.community_platform_moderation_logs.count({
    where,
  });
  const moderationLogs =
    await MyGlobal.prisma.community_platform_moderation_logs.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
      include: {
        moderator: true,
        post: {
          include: {
            community: {
              include: {
                ownerUser: true,
              },
            },
          },
        },
        comment: {
          include: {
            user: true,
          },
        },
      },
    });
  const data: ICommunityPlatformModerationLog.ISummary[] = moderationLogs.map(
    (log) => {
      const authorUser = log.post?.author_user_id
        ? {
            id: log.post.author_user_id as string & tags.Format<"uuid">,
            email: "",
            username: "",
            displayName: "",
            bio: null,
            avatarUrl: null,
            karma: 0,
            createdAt: toISOStringSafe(new Date()),
            updatedAt: toISOStringSafe(new Date()),
            deletedAt: null,
          }
        : null;
      return {
        id: log.id as string & tags.Format<"uuid">,
        actionType: log.action_type,
        actionDetails: log.action_details ?? null,
        moderator: {
          id: log.moderator.id as string & tags.Format<"uuid">,
          username: log.moderator.username,
          displayName: log.moderator.display_name ?? null,
          avatarUrl: log.moderator.avatar_url ?? null,
          karma: log.moderator.karma,
          createdAt: toISOStringSafe(log.moderator.created_at ?? new Date())!,
          updatedAt: toISOStringSafe(log.moderator.updated_at ?? new Date())!,
          deletedAt: log.moderator.deleted_at
            ? toISOStringSafe(log.moderator.deleted_at)
            : null,
        },
        post: log.post
          ? {
              id: log.post.id as string & tags.Format<"uuid">,
              title: log.post.title,
              postType: log.post.post_type,
              createdAt: toISOStringSafe(log.post.created_at ?? new Date())!,
              updatedAt: toISOStringSafe(log.post.updated_at ?? new Date())!,
              deletedAt: log.post.deleted_at
                ? toISOStringSafe(log.post.deleted_at)
                : null,
              authorUser,
              authorModerator: null,
              community: {
                id: log.post.community.id as string & tags.Format<"uuid">,
                name: log.post.community.name,
                description: log.post.community.description,
                iconUrl: log.post.community.icon_url,
                subscriberCount: 0,
                createdAt: toISOStringSafe(
                  log.post.community.created_at ?? new Date(),
                )!,
                updatedAt: toISOStringSafe(
                  log.post.community.updated_at ?? new Date(),
                )!,
                deletedAt: log.post.community.deleted_at
                  ? toISOStringSafe(log.post.community.deleted_at)
                  : null,
                ownerUser: {
                  id: log.post.community.ownerUser.id as string &
                    tags.Format<"uuid">,
                  email: log.post.community.ownerUser.email,
                  username: log.post.community.ownerUser.username,
                  displayName: log.post.community.ownerUser.display_name,
                  bio: log.post.community.ownerUser.bio ?? null,
                  avatarUrl: log.post.community.ownerUser.avatar_url ?? null,
                  karma: log.post.community.ownerUser.karma,
                  createdAt: toISOStringSafe(
                    log.post.community.ownerUser.created_at ?? new Date(),
                  )!,
                  updatedAt: toISOStringSafe(
                    log.post.community.ownerUser.updated_at ?? new Date(),
                  )!,
                  deletedAt: log.post.community.ownerUser.deleted_at
                    ? toISOStringSafe(log.post.community.ownerUser.deleted_at)
                    : null,
                },
              },
              voteScore: 0,
              commentCount: 0,
            }
          : null,
        comment: log.comment
          ? {
              id: log.comment.id as string & tags.Format<"uuid">,
              content: log.comment.content,
              isDeleted: log.comment.is_deleted,
              createdAt: toISOStringSafe(log.comment.created_at ?? new Date())!,
              updatedAt: toISOStringSafe(log.comment.updated_at ?? new Date())!,
              author: {
                id: log.comment.user.id as string & tags.Format<"uuid">,
                email: log.comment.user.email,
                username: log.comment.user.username,
                displayName: log.comment.user.display_name,
                bio: log.comment.user.bio ?? null,
                avatarUrl: log.comment.user.avatar_url ?? null,
                karma: log.comment.user.karma,
                createdAt: toISOStringSafe(
                  log.comment.user.created_at ?? new Date(),
                )!,
                updatedAt: toISOStringSafe(
                  log.comment.user.updated_at ?? new Date(),
                )!,
                deletedAt: log.comment.user.deleted_at
                  ? toISOStringSafe(log.comment.user.deleted_at)
                  : null,
              },
              parentId: log.comment.parent_id,
              children: [],
            }
          : null,
        createdAt: toISOStringSafe(log.created_at ?? new Date())!,
        updatedAt: toISOStringSafe(log.updated_at ?? new Date())!,
      };
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
