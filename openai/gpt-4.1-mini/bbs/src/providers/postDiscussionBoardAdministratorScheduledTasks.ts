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
import { DiscussionBoardScheduledTaskTransformer } from "../transformers/DiscussionBoardScheduledTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorScheduledTasks(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardScheduledTask.ICreate;
}): Promise<IDiscussionBoardScheduledTask> {
  // Check for uniqueness of taskName to prevent duplicates
  const existing =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findUnique({
      where: { task_name: props.body.taskName },
    });
  if (existing !== null) {
    throw new HttpException(
      `Task with name '${props.body.taskName}' already exists.`,
      409,
    );
  }
  // Validate cron schedule pattern format - simple inline regex validation for cron
  // Cron pattern typically has 5 or 6 space-separated fields: minute, hour, day of month, month, day of week, year(optional)
  const cronPattern = props.body.schedulePattern.trim();
  const cronRegex = /^([*\/0-9,-]+\s+){4,5}[*\/0-9,-]+$/;
  if (!cronRegex.test(cronPattern)) {
    throw new HttpException(
      `Invalid cron schedule pattern: '${props.body.schedulePattern}'.`,
      400,
    );
  }
  // Use the collector to prepare the creation data object
  const data = await DiscussionBoardScheduledTaskCollector.collect({
    body: props.body,
  });
  // Insert new scheduled task into the database
  const created = await MyGlobal.prisma.discussion_board_scheduled_tasks.create(
    { data },
  );
  // Retrieve the newly created record with selected fields
  const record =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findUniqueOrThrow({
      where: { id: created.id },
      ...DiscussionBoardScheduledTaskTransformer.select(),
    });
  // Transform to API response DTO and return
  return await DiscussionBoardScheduledTaskTransformer.transform(record);
}
