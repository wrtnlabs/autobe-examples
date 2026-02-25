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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorScheduledTasks(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardScheduledTask.IRequest;
}): Promise<IPageIDiscussionBoardScheduledTask.ISummary> {
  const {
    taskName,
    status,
    schedulePattern,
    lastRunAtMin,
    lastRunAtMax,
    page = 1,
    limit = 20,
    sort = "asc",
  } = props.body;
  const where: Prisma.discussion_board_scheduled_tasksWhereInput = {
    deleted_at: null,
    ...(taskName ? { task_name: { contains: taskName } } : {}),
    ...(status ? { status } : {}),
    ...(schedulePattern
      ? { schedule_pattern: { contains: schedulePattern } }
      : {}),
    ...(lastRunAtMin || lastRunAtMax
      ? {
          last_run_at: {
            ...(lastRunAtMin ? { gte: lastRunAtMin } : {}),
            ...(lastRunAtMax ? { lte: lastRunAtMax } : {}),
          },
        }
      : {}),
  };
  const safePage =
    Number.isInteger(page) && page !== null && page !== undefined && page > 0
      ? page
      : 1;
  const safeLimit =
    Number.isInteger(limit) &&
    limit !== null &&
    limit !== undefined &&
    limit > 0 &&
    limit <= 100
      ? limit
      : 20;
  const skip = (safePage - 1) * safeLimit;
  const orderBy: Prisma.discussion_board_scheduled_tasksOrderByWithRelationInput =
    {
      task_name: sort === "asc" ? "asc" : "desc",
    };
  const records =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findMany({
      where,
      skip,
      take: safeLimit,
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
  const total = await MyGlobal.prisma.discussion_board_scheduled_tasks.count({
    where,
  });
  return {
    data: records.map((r) => ({
      id: r.id,
      taskName: r.task_name,
      schedulePattern: r.schedule_pattern,
      lastRunAt: r.last_run_at === null ? "" : toISOStringSafe(r.last_run_at),
      status: r.status,
      createdAt: r.created_at === null ? "" : toISOStringSafe(r.created_at),
      updatedAt: r.updated_at === null ? "" : toISOStringSafe(r.updated_at),
      deletedAt: r.deleted_at === null ? "" : toISOStringSafe(r.deleted_at),
    })),
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
  };
}
