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

export async function deleteDiscussionBoardSuperAdministratorScheduledTasksId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardScheduledTask> {
  const found =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findUnique({
      where: { id: props.id },
    });
  if (found === null) throw new HttpException("Scheduled task not found", 404);
  const deleted = await MyGlobal.prisma.discussion_board_scheduled_tasks.delete(
    {
      where: { id: props.id },
    },
  );
  return deleted;
}
