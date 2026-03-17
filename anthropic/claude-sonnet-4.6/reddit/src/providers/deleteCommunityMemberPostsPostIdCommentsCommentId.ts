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
  // Step 1: Look up the post, verify it exists and is not deleted
  const post = await MyGlobal.prisma.community_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_community_id: true,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  // Step 2: Look up the comment, verify it exists, is not deleted, and belongs to the given post
  const comment = await MyGlobal.prisma.community_comments.findFirst({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
    select: {
      id: true,
      member_id: true,
      post_id: true,
    },
  });
  if (comment === null || comment.post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  // Step 3: Authorization check
  const isAuthor = comment.member_id === props.member.id;
  if (!isAuthor) {
    // Check if requesting member is a moderator or owner of the community
    const moderatorRecord =
      await MyGlobal.prisma.community_moderators.findFirst({
        where: {
          community_id: post.community_community_id,
          member_id: props.member.id,
          role: { in: ["owner", "moderator"] },
        },
        select: { id: true },
      });
    if (moderatorRecord === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 4 & 5: Inside a transaction, collect all descendant comment IDs via BFS
  // and atomically soft-delete all of them
  await MyGlobal.prisma.$transaction(async (tx) => {
    const allCommentIds: string[] = [props.commentId];
    const queue: string[] = [props.commentId];
    while (queue.length > 0) {
      const currentBatch = queue.splice(0, queue.length);
      const children = await tx.community_comments.findMany({
        where: {
          parent_id: { in: currentBatch },
          deleted_at: null,
        },
        select: { id: true },
      });
      for (const child of children) {
        allCommentIds.push(child.id);
        queue.push(child.id);
      }
    }
    await tx.community_comments.updateMany({
      where: {
        id: { in: allCommentIds },
      },
      data: {
        deleted_at: new Date(),
      },
    });
  });
}
