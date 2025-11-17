import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function deleteEconomicBoardCitizenPostsPostIdCommentsCommentId(props: {
  citizen: CitizenPayload;
  postId: string;
  commentId: string;
}): Promise<void> {
  const comment = await MyGlobal.prisma.economic_board_comments.findUnique({
    where: {
      id: props.commentId,
    },
    include: {
      post: true,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.post?.status !== "published") {
    throw new HttpException("Comment not found", 404);
  }

  if (
    comment.citizen_id !== props.citizen.id &&
    props.citizen.type === "citizen"
  ) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      status: "deleted",
    },
  });
}
