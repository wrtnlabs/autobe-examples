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
import { DiscussionBoardScheduledTaskTransformer } from "../transformers/DiscussionBoardScheduledTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorScheduledTasksId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardScheduledTask.IUpdate;
}): Promise<IDiscussionBoardScheduledTask> {
  // Retrieve existing scheduled task or throw 404
  const existing =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findUniqueOrThrow({
      where: { id: props.id },
    });
  // Validate task_name uniqueness if updated
  if (
    props.body.taskName !== undefined &&
    props.body.taskName !== existing.task_name
  ) {
    const duplicate =
      await MyGlobal.prisma.discussion_board_scheduled_tasks.findFirst({
        where: { task_name: props.body.taskName },
      });
    if (duplicate !== null) {
      throw new HttpException("Task name already used", 400);
    }
  }
  // Validate cron schedule pattern if updated
  if (props.body.schedulePattern !== undefined) {
    const cronPattern = props.body.schedulePattern.trim();
    if (!isValidCron(cronPattern)) {
      throw new HttpException("Invalid cron schedule pattern", 400);
    }
  }
  // Validate status if updated
  const allowedStatuses = ["active", "inactive", "paused"];
  if (
    props.body.status !== undefined &&
    !allowedStatuses.includes(props.body.status)
  ) {
    throw new HttpException("Invalid status value", 400);
  }
  // Prepare update data
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const dataToUpdate = {
    ...(props.body.taskName !== undefined && {
      task_name: props.body.taskName,
    }),
    ...(props.body.schedulePattern !== undefined && {
      schedule_pattern: props.body.schedulePattern,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    updated_at: now,
  };
  // Update the record
  const updatedDb =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.update({
      where: { id: props.id },
      data: dataToUpdate,
      ...DiscussionBoardScheduledTaskTransformer.select(),
    });
  // Transform and return the updated record
  return await DiscussionBoardScheduledTaskTransformer.transform(updatedDb);
}
/**
 * Simple cron schedule validation function.
 * Accepts 5 or 6 fields separated by spaces.
 * Each field must contain only digits, *, /, -, or , characters.
 * This is a basic check and does not guarantee valid cron semantics.
 *
 * @param pattern - Cron schedule string to validate
 * @returns boolean indicating if pattern is valid.
 */
function isValidCron(pattern: string): boolean {
  const parts = pattern.split(" ");
  if (parts.length < 5 || parts.length > 6) {
    return false;
  }
  const regex = /^[\d\*\/\-\,]+$/;
  return parts.every((part) => regex.test(part));
}
