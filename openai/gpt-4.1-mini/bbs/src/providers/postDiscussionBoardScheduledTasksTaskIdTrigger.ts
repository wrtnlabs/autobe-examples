import { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardScheduledTasksTaskIdTrigger(props: {
  taskId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardScheduledTask> {
  const { taskId } = props;
  const existingTask =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findUnique({
      where: { id: taskId },
    });
  if (!existingTask || existingTask.deleted_at !== null) {
    throw new HttpException("Scheduled task not found", 404);
  }
  const currentTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updatedTask = await MyGlobal.prisma.$transaction(async (tx) => {
    const updated = await tx.discussion_board_scheduled_tasks.update({
      where: { id: taskId },
      data: {
        last_run_at: currentTimestamp,
        status: "running",
        updated_at: currentTimestamp,
      },
    });
    return updated;
  });
  return updatedTask;
}
