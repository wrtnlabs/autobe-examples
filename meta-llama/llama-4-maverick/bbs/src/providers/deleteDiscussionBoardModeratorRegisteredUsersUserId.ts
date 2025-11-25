import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorRegisteredUsersUserId(props: {
  moderator: ModeratorPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    const user =
      await MyGlobal.prisma.discussion_board_registered_users.findUnique({
        where: { id: props.userId },
      });
    if (!user) {
      throw new HttpException("User not found", 404);
    }
    await MyGlobal.prisma.discussion_board_registered_users.delete({
      where: { id: props.userId },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("User not found", 404);
    }
    throw new HttpException("Failed to delete user", 500);
  }
}
