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

export async function deleteRedditLikeMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch comment with post details to get community_id for moderator check
  const comment = await MyGlobal.prisma.reddit_like_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      post_id: true,
      author_id: true,
      is_deleted: true,
      post: {
        select: {
          community_id: true,
        },
      },
    },
  });
  // Comment not found or belongs to different post
  if (comment === null || comment.post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  // Already deleted - treat as not found
  if (comment.is_deleted) {
    throw new HttpException("Comment not found", 404);
  }
  // Check authorization: is author?
  const isAuthor = comment.author_id === props.member.id;
  // If not author, check if moderator of the community
  let isModerator = false;
  if (!isAuthor) {
    const moderator = await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: comment.post.community_id,
        deleted_at: null,
      },
    });
    isModerator = moderator !== null;
  }
  // Neither author nor moderator
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the comment
  await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: props.commentId },
    data: {
      is_deleted: true,
      updated_at: new Date(),
    },
  });
}
