import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorModerationQueuesQueueId(props: {
  moderator: ModeratorPayload;
  queueId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the moderation queue entry exists and is not deleted
  const queue =
    await MyGlobal.prisma.discussion_board_moderation_queues.findFirst({
      where: {
        id: props.queueId,
        deleted_at: null,
      },
    });

  if (!queue) {
    throw new HttpException("Moderation queue entry not found", 404);
  }

  // Check if the queue is currently assigned to a moderator
  if (
    queue.discussion_board_moderator_id !== null &&
    queue.completed_at === null
  ) {
    throw new HttpException(
      "Cannot delete a moderation queue that is currently assigned to a moderator",
      400,
    );
  }

  // Perform soft deletion
  await MyGlobal.prisma.discussion_board_moderation_queues.update({
    where: {
      id: props.queueId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
