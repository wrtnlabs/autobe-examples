import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumComment";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function putPoliticalForumCitizenPostsPostIdCommentsCommentId(props: {
  citizen: CitizenPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IPoliticalForumComment.IUpdate;
}): Promise<IPoliticalForumComment> {
  // Find the comment matching postId and commentId
  const comment = await MyGlobal.prisma.political_forum_comments.findUnique({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
  });

  // If comment doesn't exist or is deleted, throw 404
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Business rule: Only allow updates within 24 hours of creation
  // Convert comment.created_at to Date for comparison (safe, since API always returns valid ISO strings)
  const commentCreatedAt = new Date(comment.created_at);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Compare as Date objects — allowed here for computation, but return value must be string
  if (commentCreatedAt < twentyFourHoursAgo) {
    throw new HttpException(
      "Comment can only be updated within 24 hours of creation",
      403,
    );
  }

  // Verify ownership: citizen must be the author of the comment
  if (comment.citizen_id !== props.citizen.id) {
    // Check if citizen is a moderator
    const moderator =
      await MyGlobal.prisma.political_forum_moderators.findFirst({
        where: {
          id: props.citizen.id,
          deleted_at: null,
        },
      });

    if (!moderator) {
      throw new HttpException(
        "Forbidden: Only author or moderator can update comment",
        403,
      );
    }
  }

  // Perform the update
  const updated = await MyGlobal.prisma.political_forum_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated comment with fields mapped to correct string & tags.Format<'date-time'>
  return typia.assert<IPoliticalForumComment>({
    id: updated.id,
    post_id: updated.post_id,
    author_id: updated.citizen_id,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated.updated_at ? toISOStringSafe(updated.updated_at) : null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  });
}
