import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformModeratorModerationLogsModerationLogId(props: {
  moderator: ModeratorPayload;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationLog> {
  const log =
    await MyGlobal.prisma.community_platform_moderation_logs.findUnique({
      where: { id: props.moderationLogId },
      select: {
        id: true,
        moderator_id: true,
        post_id: true,
        comment_id: true,
        action_type: true,
        action_details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: {
          select: {
            id: true,
            display_name: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        comment: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  if (!log) {
    throw new HttpException("Moderation log not found", 404);
  }
  return {
    id: log.id,
    moderator_id: log.moderator_id,
    post_id: log.post_id ?? null,
    comment_id: log.comment_id ?? null,
    action_type: log.action_type,
    action_details: log.action_details ?? null,
    created_at: toISOStringSafe(log.created_at),
    updated_at: log.updated_at ? toISOStringSafe(log.updated_at) : null,
    deleted_at: log.deleted_at ? toISOStringSafe(log.deleted_at) : null,
    moderator: {
      id: log.moderator?.id ?? "",
      display_name: log.moderator?.display_name ?? "",
      email: log.moderator?.email ?? "",
      created_at: log.moderator?.created_at
        ? toISOStringSafe(log.moderator.created_at)
        : "",
      updated_at: log.moderator?.updated_at
        ? toISOStringSafe(log.moderator.updated_at)
        : null,
      deleted_at: log.moderator?.deleted_at
        ? toISOStringSafe(log.moderator.deleted_at)
        : null,
    },
    post:
      log.post_id === null || !log.post
        ? null
        : {
            id: log.post.id,
            title: log.post.title,
            created_at: toISOStringSafe(log.post.created_at),
            updated_at: log.post.updated_at
              ? toISOStringSafe(log.post.updated_at)
              : null,
            deleted_at: log.post.deleted_at
              ? toISOStringSafe(log.post.deleted_at)
              : null,
          },
    comment:
      log.comment_id === null || !log.comment
        ? null
        : {
            id: log.comment.id,
            created_at: toISOStringSafe(log.comment.created_at),
            updated_at: log.comment.updated_at
              ? toISOStringSafe(log.comment.updated_at)
              : null,
            deleted_at: log.comment.deleted_at
              ? toISOStringSafe(log.comment.deleted_at)
              : null,
          },
  };
}
