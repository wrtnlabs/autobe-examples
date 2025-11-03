import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminModerationActionsModerationActionId(props: {
  admin: AdminPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.discussion_board_moderation_actions.delete({
      where: { id: props.moderationActionId },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("Moderation action not found", 404);
    }
    throw error;
  }
}
