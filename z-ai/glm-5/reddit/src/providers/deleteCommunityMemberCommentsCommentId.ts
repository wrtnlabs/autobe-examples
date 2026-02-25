import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string;
}): Promise<void> {
  const comment = await MyGlobal.prisma.community_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      community_member_id: true,
      community_post_id: true,
      is_deleted: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.is_deleted) {
    throw new HttpException("Comment already deleted", 400);
  }
  if (comment.community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_comments.update({
      where: { id: props.commentId },
      data: {
        is_deleted: true,
        deleted_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.community_posts.update({
      where: { id: comment.community_post_id },
      data: {
        comment_count: { decrement: 1 },
        updated_at: now,
      },
    }),
  ]);
}
