import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteCommunityPlatformModeratorCommentsCommentIdRepliesReplyId(props: {
  moderator: ModeratorPayload;
  commentId: string;
  replyId: string;
}): Promise<void> {
  // Verify reply exists and belongs to the specified comment
  const reply = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: {
      id: props.replyId,
      parent_id: props.commentId,
      deleted_at: null,
    },
  });
  if (!reply) {
    throw new HttpException("Reply not found or already deleted", 404);
  }
  // Update reply to mark as deleted
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.replyId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Decrement parent comment's reply count
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: {
      reply_count: {
        decrement: 1,
      },
    },
  });
  // Log moderation action
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      action_type: "DELETE_REPLY",
      actor_id: props.moderator.id,
      target_id: props.replyId,
      target_type: "COMMENT_REPLY",
      created_at: toISOStringSafe(new Date()),
    },
  });
}
