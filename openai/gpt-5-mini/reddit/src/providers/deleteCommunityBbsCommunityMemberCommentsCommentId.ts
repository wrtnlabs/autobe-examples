import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function deleteCommunityBbsCommunityMemberCommentsCommentId(props: {
  communityMember: CommunitymemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { communityMember, commentId } = props;

  const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      community_bbs_communitymember_id: true,
      community_bbs_post_id: true,
      deleted_at: true,
    },
  });

  if (!comment) throw new HttpException("Not Found", 404);
  if (comment.deleted_at !== null)
    throw new HttpException("Conflict: comment already deleted", 409);
  if (comment.community_bbs_communitymember_id !== communityMember.id)
    throw new HttpException(
      "Unauthorized: You can only delete your own comments",
      403,
    );

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_bbs_comments.update({
      where: { id: commentId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });

    const post = await prisma.community_bbs_posts.findUniqueOrThrow({
      where: { id: comment.community_bbs_post_id },
      select: { comment_count: true },
    });

    const newCount = post.comment_count > 0 ? post.comment_count - 1 : 0;

    await prisma.community_bbs_posts.update({
      where: { id: comment.community_bbs_post_id },
      data: {
        comment_count: newCount,
        updated_at: now,
      },
    });

    await prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "community_member",
        actor_id: communityMember.id,
        entity: "comment",
        action: "deleted",
        target_comment_id: commentId,
        payload: JSON.stringify({ reason: "deleted_by_author" }),
        created_at: now,
        updated_at: now,
      },
    });
  });
}
