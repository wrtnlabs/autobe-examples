import { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardScheduledTaskCollector } from "../collectors/DiscussionBoardScheduledTaskCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorScheduledTasks(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardScheduledTask.ICreate;
}): Promise<IDiscussionBoardScheduledTask> {
  const taskName = (props.body as any).task_name as string;
  const schedulePattern = (props.body as any).schedule_pattern as string;
  const cronPattern = schedulePattern;
  const cronRegex = /^([\d\*\/\-,]{1,5})(\s+([\d\*\/\-,]{1,5})){4}$/;
  if (!cronRegex.test(cronPattern)) {
    throw new HttpException("Invalid cron schedule_pattern format", 400);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.discussion_board_scheduled_tasks.findUnique({
      where: { task_name: taskName },
      select: { id: true },
    });
    if (existing) {
      throw new HttpException("Task name must be unique", 409);
    }
    // Provide complete create input including required properties
    const createInput = await DiscussionBoardScheduledTaskCollector.collect({
      body: {
        task_name: taskName,
        schedule_pattern: schedulePattern,
        last_run_at: null,
        status: "pending",
      },
    });
    const created = await tx.discussion_board_scheduled_tasks.create({
      data: createInput,
    });
    return {
      id: created.id as string & tags.Format<"uuid">,
      task_name: created.task_name,
      schedule_pattern: created.schedule_pattern,
      last_run_at:
        created.last_run_at === null
          ? null
          : toISOStringSafe(created.last_run_at),
      status: created.status,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
    };
  });
}
