import { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorScheduledTasksId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardScheduledTask.IUpdate;
}): Promise<IDiscussionBoardScheduledTask> {
  const task =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findUnique({
      where: { id: props.id },
      select: { id: true },
    });
  if (!task) {
    throw new HttpException("Scheduled task not found", 404);
  }
  await MyGlobal.prisma.discussion_board_scheduled_tasks.update({
    where: { id: props.id },
    data: {
      updated_at: toISOStringSafe(new Date()),
      // Since IDiscussionBoardScheduledTask.IUpdate is empty, no fields are updated explicitly
    },
  });
  // Return the updated record by querying it directly
  const updated =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findUnique({
      where: { id: props.id },
    });
  if (!updated) {
    throw new HttpException("Scheduled task not found after update", 404);
  }
  return updated;
}
