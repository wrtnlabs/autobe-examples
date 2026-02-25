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
import { DiscussionBoardScheduledTaskTransformer } from "../transformers/DiscussionBoardScheduledTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdministratorScheduledTasksId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardScheduledTask.IUpdate;
}): Promise<IDiscussionBoardScheduledTask> {
  // Check existence of scheduled task
  await MyGlobal.prisma.discussion_board_scheduled_tasks.findUniqueOrThrow({
    where: { id: props.id },
  });
  // Validate taskName uniqueness if provided
  if (props.body.taskName !== undefined) {
    const existing =
      await MyGlobal.prisma.discussion_board_scheduled_tasks.findFirst({
        where: {
          task_name: props.body.taskName,
          id: { not: props.id },
          deleted_at: null,
        },
      });
    if (existing !== null) {
      throw new HttpException(
        `Scheduled task name '${props.body.taskName}' is already in use.`,
        400,
      );
    }
  }
  // Validate schedulePattern (basic cron validation)
  if (props.body.schedulePattern !== undefined) {
    if (
      !/^([\d\/*,-]+\s+){4}[\d\/*,-]+$/.test(props.body.schedulePattern.trim())
    ) {
      throw new HttpException(
        `Invalid cron schedule pattern '${props.body.schedulePattern}'.`,
        400,
      );
    }
  }
  // Validate status values
  if (props.body.status !== undefined) {
    const allowed = ["active", "inactive", "paused"];
    if (!allowed.includes(props.body.status)) {
      throw new HttpException(
        `Invalid status '${props.body.status}'. Allowed values are: ${allowed.join(", ")}.`,
        400,
      );
    }
  }
  // Build update data
  const data: {
    task_name?: string;
    schedule_pattern?: string;
    status?: string;
    updated_at: Date;
  } = { updated_at: new Date() };
  if (props.body.taskName !== undefined) data.task_name = props.body.taskName;
  if (props.body.schedulePattern !== undefined)
    data.schedule_pattern = props.body.schedulePattern;
  if (props.body.status !== undefined) data.status = props.body.status;
  // Update scheduled task
  const updated = await MyGlobal.prisma.discussion_board_scheduled_tasks.update(
    {
      where: { id: props.id },
      data,
      ...DiscussionBoardScheduledTaskTransformer.select(),
    },
  );
  return await DiscussionBoardScheduledTaskTransformer.transform(updated);
}
