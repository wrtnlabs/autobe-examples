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

export async function deleteCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the comment
  const comment = await MyGlobal.prisma.community_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // 2. Verify authorization - check if user is comment author or community moderator
  if (comment.author_id !== props.member.id) {
    // Verify user is community moderator for this post's community
    const post = await MyGlobal.prisma.community_posts.findUnique({
      where: { id: props.postId },
      select: { community_id: true },
    });
    if (!post) {
      throw new HttpException("Post not found", 404);
    }
    const moderatorCount = await MyGlobal.prisma.community_moderators.count({
      where: {
        user_id: props.member.id,
        community_id: post.community_id,
        is_owner: true,
      },
    });
    if (moderatorCount === 0) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 3. Soft delete the comment
  await MyGlobal.prisma.community_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
