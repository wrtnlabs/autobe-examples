import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorModerationActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the moderation action exists
  const existingAction =
    await MyGlobal.prisma.discussion_board_moderation_actions.findUnique({
      where: { id: props.actionId },
    });

  if (!existingAction) {
    throw new HttpException("Moderation action not found", 404);
  }

  // Perform hard deletion
  await MyGlobal.prisma.discussion_board_moderation_actions.delete({
    where: { id: props.actionId },
  });
}
