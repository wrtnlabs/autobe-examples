import { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdministratorScheduledTasksId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardScheduledTask.IUpdate;
}): Promise<IDiscussionBoardScheduledTask> {
  const task =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findUnique({
      where: { id: props.id },
    });
  if (!task) {
    throw new HttpException("Scheduled task not found", 404);
  }
  return task;
}
