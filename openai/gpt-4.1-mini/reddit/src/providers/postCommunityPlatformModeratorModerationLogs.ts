import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformModerationLogCollector } from "../collectors/CommunityPlatformModerationLogCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorModerationLogs(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerationLog.ICreate;
}): Promise<ICommunityPlatformModerationLog> {
  const { moderator, body } = props;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const { post_id, comment_id } = (body as any) ?? {};
    if (typeof post_id === "string" && post_id.length > 0) {
      const postExists = await tx.community_platform_posts.findUnique({
        where: { id: post_id },
        select: { id: true },
      });
      if (!postExists) {
        throw new HttpException("Post not found", 400);
      }
    }
    if (typeof comment_id === "string" && comment_id.length > 0) {
      const commentExists = await tx.community_platform_comments.findUnique({
        where: { id: comment_id },
        select: { id: true },
      });
      if (!commentExists) {
        throw new HttpException("Comment not found", 400);
      }
    }
    const data = await CommunityPlatformModerationLogCollector.collect({
      body,
      moderator,
    });
    const created = await tx.community_platform_moderation_logs.create({
      data,
    });
    return {
      id: created.id,
      moderator_id: created.moderator_id,
      post_id: created.post_id ?? null,
      comment_id: created.comment_id ?? null,
      action_type: created.action_type,
      action_details: created.action_details ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  });
}
