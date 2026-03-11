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

export async function deleteRedditLikeMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string;
}): Promise<void> {
  const comment = await MyGlobal.prisma.reddit_like_comments.findFirst({
    where: { id: props.commentId, deleted_at: null },
    select: {
      id: true,
      author_id: true,
      post_id: true,
      post: { select: { community_id: true } },
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  const isAuthor = comment.author_id === props.member.id;
  if (!isAuthor) {
    const moderator =
      await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
        where: {
          user_id: props.member.id,
          community_id: comment.post.community_id,
        },
      });
    if (!moderator) throw new HttpException("Forbidden", 403);
  }
  const replies = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: { parent_comment_id: props.commentId, deleted_at: null },
    select: { id: true },
  });
  const idsToDelete = [props.commentId, ...replies.map((r) => r.id)];
  await MyGlobal.prisma.reddit_like_comments.updateMany({
    where: { id: { in: idsToDelete } },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: comment.post_id },
    data: { comment_count: { decrement: idsToDelete.length } },
  });
}
