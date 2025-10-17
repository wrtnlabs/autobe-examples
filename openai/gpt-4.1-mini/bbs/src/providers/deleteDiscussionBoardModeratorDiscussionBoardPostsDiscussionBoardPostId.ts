import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorDiscussionBoardPostsDiscussionBoardPostId(props: {
  moderator: ModeratorPayload;
  discussionBoardPostId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { discussionBoardPostId } = props;

  try {
    await MyGlobal.prisma.discussion_board_posts.findUniqueOrThrow({
      where: { id: discussionBoardPostId },
    });

    await MyGlobal.prisma.discussion_board_posts.delete({
      where: { id: discussionBoardPostId },
    });
  } catch (error) {
    // Prisma throws P2025 code for not found in delete/findUniqueOrThrow
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("Discussion board post not found", 404);
    }
    throw error;
  }
}
