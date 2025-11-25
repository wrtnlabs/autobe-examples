import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconomicBoardModeratorCommentsCommentId(props: {
  moderator: ModeratorPayload;
  commentId: string;
}): Promise<void> {
  try {
    await MyGlobal.prisma.economic_board_comments.delete({
      where: { id: props.commentId },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("Comment not found", 404);
    }
    throw error;
  }
}
