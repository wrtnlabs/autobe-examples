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
import { DiscussionBoardScheduledTaskTransformer } from "../transformers/DiscussionBoardScheduledTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorScheduledTasks(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardScheduledTask.ICreate;
}): Promise<IDiscussionBoardScheduledTask> {
  const { body } = props;
  // Check taskName uniqueness
  const existing =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findUnique({
      where: { task_name: body.taskName },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException("Task name must be unique", 409);
  }
  // Validate cron expression
  const isValidCron = (function isValidCronExpression(expr: string): boolean {
    try {
      // Lightweight cron validation, supports 5-field crons
      // Reject unsupported cron expressions
      const parts = expr.trim().split(/\s+/);
      return (
        parts.length >= 5 &&
        parts.length <= 7 &&
        parts.every((p) => p.length > 0)
      );
    } catch {
      return false;
    }
  })(body.schedulePattern);
  if (!isValidCron) {
    throw new HttpException("Invalid schedule pattern (cron syntax)", 400);
  }
  // Collect data for insertion
  const data = await DiscussionBoardScheduledTaskCollector.collect({ body });
  const created = await MyGlobal.prisma.discussion_board_scheduled_tasks.create(
    {
      data,
      ...DiscussionBoardScheduledTaskTransformer.select(),
    },
  );
  return DiscussionBoardScheduledTaskTransformer.transform(created);
}
