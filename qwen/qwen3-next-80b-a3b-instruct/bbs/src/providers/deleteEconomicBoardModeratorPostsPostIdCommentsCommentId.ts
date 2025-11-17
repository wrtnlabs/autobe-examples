import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconomicBoardModeratorPostsPostIdCommentsCommentId(props: {
  moderator: ModeratorPayload;
  postId: string;
  commentId: string;
}): Promise<void> {
  const comment = await MyGlobal.prisma.economic_board_comments.findUnique({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      moderator_deleted_id: props.moderator.id,
    },
  });
}
