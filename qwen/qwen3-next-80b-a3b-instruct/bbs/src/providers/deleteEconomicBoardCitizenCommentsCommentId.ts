import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function deleteEconomicBoardCitizenCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string;
}): Promise<void> {
  const comment = await MyGlobal.prisma.economic_board_comments.findUnique({
    where: {
      id: props.commentId,
      deleted_at: null,
      status: "published",
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found or already deleted", 404);
  }

  if (comment.citizen_id !== props.citizen.id) {
    throw new HttpException("Forbidden: Only comment owner can delete", 403);
  }

  await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      status: "deleted",
    },
  });
}
