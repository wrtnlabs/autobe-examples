import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformAdminModerationLogsModerationLogId(props: {
  admin: AdminPayload;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationLog> {
  const record =
    await MyGlobal.prisma.community_platform_moderation_logs.findUnique({
      where: { id: props.moderationLogId },
      include: {
        moderator: true,
        post: true,
        comment: true,
      },
    });
  if (!record) {
    throw new HttpException("Moderation log not found", 404);
  }
  return {
    id: record.id,
    moderator_id: record.moderator_id,
    post_id: record.post_id === null ? null : record.post_id,
    comment_id: record.comment_id === null ? null : record.comment_id,
    action_type: record.action_type,
    action_details:
      record.action_details === null ? null : record.action_details,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    moderator:
      record.moderator === null
        ? null
        : {
            id: record.moderator.id,
            email: record.moderator.email,
            password_hash: record.moderator.password_hash,
            username: record.moderator.username,
            display_name:
              record.moderator.display_name === null
                ? null
                : record.moderator.display_name,
            bio: record.moderator.bio === null ? null : record.moderator.bio,
            avatar_url:
              record.moderator.avatar_url === null
                ? null
                : record.moderator.avatar_url,
            karma: record.moderator.karma,
            created_at: toISOStringSafe(record.moderator.created_at),
            updated_at: toISOStringSafe(record.moderator.updated_at),
            deleted_at:
              record.moderator.deleted_at === null
                ? null
                : toISOStringSafe(record.moderator.deleted_at),
          },
    post:
      record.post === null
        ? null
        : {
            id: record.post.id,
            community_id: record.post.community_id,
            author_user_id:
              record.post.author_user_id === null
                ? null
                : record.post.author_user_id,
            author_moderator_id:
              record.post.author_moderator_id === null
                ? null
                : record.post.author_moderator_id,
            title: record.post.title,
            post_type: record.post.post_type,
            created_at: toISOStringSafe(record.post.created_at),
            updated_at: toISOStringSafe(record.post.updated_at),
            deleted_at:
              record.post.deleted_at === null
                ? null
                : toISOStringSafe(record.post.deleted_at),
          },
    comment:
      record.comment === null
        ? null
        : {
            id: record.comment.id,
            user_id: record.comment.user_id,
            post_id: record.comment.post_id,
            parent_id:
              record.comment.parent_id === null
                ? null
                : record.comment.parent_id,
            content: record.comment.content,
            is_deleted: record.comment.is_deleted,
            created_at: toISOStringSafe(record.comment.created_at),
            updated_at: toISOStringSafe(record.comment.updated_at),
            deleted_at:
              record.comment.deleted_at === null
                ? null
                : toISOStringSafe(record.comment.deleted_at),
          },
  };
}
