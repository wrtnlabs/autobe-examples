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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorScheduledTasks(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardScheduledTask.ICreate;
}): Promise<IDiscussionBoardScheduledTask> {
  // Check uniqueness of task_name
  const existing =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findUnique({
      where: { task_name: (props.body as any).task_name },
    });
  if (existing) {
    throw new HttpException("Task name already exists", 400);
  }
  // Validate schedule_pattern format (cron with exactly 5 fields)
  const schedulePattern = (props.body as any).schedule_pattern;
  if (
    typeof schedulePattern !== "string" ||
    schedulePattern.trim().split(/\s+/).length !== 5
  ) {
    throw new HttpException(
      "Invalid schedule pattern format: must have 5 fields",
      400,
    );
  }
  // Prepare full body for collector with exact required properties
  const createBody = {
    task_name: (props.body as any).task_name,
    schedule_pattern: schedulePattern,
    last_run_at: null as Date | null, // default null as not provided
    status: "pending" as
      | "pending"
      | "in_progress"
      | "completed"
      | "failed"
      | "cancelled",
  };
  // Use collector to prepare prisma create input
  const createData = await DiscussionBoardScheduledTaskCollector.collect({
    body: createBody,
  });
  // Transactional create
  const created = await MyGlobal.prisma.$transaction(async (tx) =>
    tx.discussion_board_scheduled_tasks.create({ data: createData }),
  );
  // Return converted created record
  return {
    id: created.id,
    task_name: created.task_name,
    schedule_pattern: created.schedule_pattern,
    last_run_at: created.last_run_at
      ? toISOStringSafe(created.last_run_at)
      : null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
