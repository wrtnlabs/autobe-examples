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
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberCommentsCommentIdRepliesReplyId(props: {
  member: MemberPayload;
  commentId: string;
  replyId: string;
}): Promise<ICommunityPlatformComment> {
  // Verify reply exists and belongs to parent comment
  const reply = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: {
      id: props.replyId,
      parent_id: props.commentId,
    },
  });
  if (!reply) {
    throw new HttpException(
      "Reply not found or does not belong to specified comment",
      404,
    );
  }
  // Verify authorization: creator or moderator
  if (reply.author_id !== props.member.id) {
    // Check if member is moderator
    const isModerator =
      await MyGlobal.prisma.community_platform_moderators.findUnique({
        where: { id: props.member.id },
      });
    if (!isModerator) {
      throw new HttpException(
        "You are not authorized to delete this reply",
        403,
      );
    }
  }
  // Soft delete: set deleted_at to current ISO 8601 datetime
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Update reply with soft-delete
  const updatedReply = await MyGlobal.prisma.community_platform_comments.update(
    {
      where: { id: props.replyId },
      data: {
        deleted_at: now,
      },
    },
  );
  // Return deleted reply object with deleted_at populated
  return {
    id: updatedReply.id,
    parent_id: updatedReply.parent_id,
  };
}
