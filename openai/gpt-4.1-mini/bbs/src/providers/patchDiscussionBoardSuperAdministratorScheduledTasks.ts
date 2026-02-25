import { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardScheduledTask";
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

export async function patchDiscussionBoardSuperAdministratorScheduledTasks(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardScheduledTask.IRequest;
}): Promise<IPageIDiscussionBoardScheduledTask.ISummary> {
  const {
    taskName,
    status,
    schedulePattern,
    lastRunAtMin,
    lastRunAtMax,
    page: pageRaw,
    limit: limitRaw,
    sort,
  } = props.body;
  const page =
    typeof pageRaw === "number" && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const limit =
    typeof limitRaw === "number" && limitRaw >= 1 && limitRaw <= 100
      ? Math.floor(limitRaw)
      : 20;
  const skip = (page - 1) * limit;
  // Prepare filters without using native Date
  const where: Prisma.discussion_board_scheduled_tasksWhereInput = {
    deleted_at: null,
    ...(typeof taskName === "string" && taskName !== ""
      ? { task_name: { contains: taskName } }
      : {}),
    ...(typeof status === "string" && status !== "" ? { status } : {}),
    ...(typeof schedulePattern === "string" && schedulePattern !== ""
      ? { schedule_pattern: { contains: schedulePattern } }
      : {}),
    ...(typeof lastRunAtMin === "string" && lastRunAtMin !== ""
      ? { last_run_at: { gte: lastRunAtMin } }
      : {}),
    ...(typeof lastRunAtMax === "string" && lastRunAtMax !== ""
      ? { last_run_at: { lte: lastRunAtMax } }
      : {}),
  };
  const total = await MyGlobal.prisma.discussion_board_scheduled_tasks.count({
    where,
  });
  const orderBy: Prisma.Enumerable<Prisma.discussion_board_scheduled_tasksOrderByWithRelationInput> =
    [];
  if (sort === "asc" || sort === "desc") {
    orderBy.push({ task_name: sort });
    orderBy.push({ created_at: sort });
  } else {
    orderBy.push({ created_at: "desc" });
  }
  const records =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        task_name: true,
        schedule_pattern: true,
        last_run_at: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const data = records.map((record) => ({
    id: record.id,
    taskName: record.task_name,
    schedulePattern: record.schedule_pattern,
    lastRunAt:
      record.last_run_at === null ? null : toISOStringSafe(record.last_run_at),
    status: record.status,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
