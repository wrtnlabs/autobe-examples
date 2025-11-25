import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function putEconomicBoardCitizenPostsPostIdCommentsCommentId(props: {
  citizen: CitizenPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IEconomicBoardComment.IUpdate;
}): Promise<IEconomicBoardComment> {
  // Find the target comment
  const comment = await MyGlobal.prisma.economic_board_comments.findUnique({
    where: {
      id: props.commentId,
      citizen_id: props.citizen.id,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found or access denied", 404);
  }

  // Verify the associated post is published
  const post = await MyGlobal.prisma.economic_board_posts.findUnique({
    where: {
      id: props.postId,
      status: "published",
    },
  });

  if (!post) {
    throw new HttpException("Post is not published or does not exist", 404);
  }

  // Calculate 24-hour window using ISO string comparison (no Date objects)
  const now = toISOStringSafe(new Date());
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const commentCreationTime = toISOStringSafe(comment.created_at);

  // Use string comparison for ISO timestamps
  if (commentCreationTime < twentyFourHoursAgo) {
    throw new HttpException(
      "Cannot edit comment - outside 24-hour window",
      403,
    );
  }

  // Update the comment
  const updated = await MyGlobal.prisma.economic_board_comments.update({
    where: {
      id: props.commentId,
    },
    data: {
      body: props.body.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return properly typed response
  return {
    id: updated.id,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    status: updated.status satisfies string as "published" | "deleted",
    post_id: updated.post_id,
    citizen_id: updated.citizen_id,
    parent_comment_id: updated.parent_comment_id ?? undefined,
    moderator_deleted_id: updated.moderator_deleted_id ?? undefined,
  };
}
