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
import { IEconomicForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostComment";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicForumPostCommentTransformer } from "../transformers/EconomicForumPostCommentTransformer";

export async function putEconomicForumUserPostsPostIdCommentsCommentId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IEconomicForumPostComment.IUpdate;
}): Promise<IEconomicForumPostComment> {
  // Verify comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.economic_forum_post_comments.findUnique(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        body: true,
        post_id: true,
        user_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 404);
  }
  // Verify post matches
  if (comment.post_id !== props.postId) {
    throw new HttpException("Comment does not belong to this post", 400);
  }
  // Verify user is the creator of the comment
  if (comment.user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden - You can only update your own comments",
      403,
    );
  }
  // Update the comment with new data
  // The IEconomicForumPostComment.IUpdate interface is empty, meaning no fields are modifiable via request body
  // Given the specification says "full replacement of comment's content, metadata, and modification details"
  // but the IUpdate interface is {}, we must assume the system will update only the timestamp
  // and any fields mapped by the transformer (like status) must be handled by the system internally
  // No external fields are modifiable in this version of the interface
  const updated = await MyGlobal.prisma.economic_forum_post_comments.update({
    where: { id: props.commentId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      body: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      post_id: true,
      parent_id: true,
      user_id: true,
    },
  });
  // Return using the transformer
  return EconomicForumPostCommentTransformer.transform(updated);
}
