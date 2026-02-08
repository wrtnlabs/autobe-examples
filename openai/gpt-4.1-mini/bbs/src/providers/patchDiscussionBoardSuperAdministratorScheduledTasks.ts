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
  const bodyAny = props.body as any;
  const page = bodyAny.page && bodyAny.page > 0 ? bodyAny.page : 1;
  const limit = bodyAny.limit && bodyAny.limit > 0 ? bodyAny.limit : 100;
  const whereInput: Prisma.discussion_board_scheduled_tasksWhereInput = {
    deleted_at: null,
  };
  if (
    typeof bodyAny.task_name === "string" &&
    bodyAny.task_name.trim() !== ""
  ) {
    whereInput.task_name = { contains: bodyAny.task_name };
  }
  if (Array.isArray(bodyAny.status) && bodyAny.status.length > 0) {
    whereInput.status = { in: bodyAny.status };
  }
  if (
    typeof bodyAny.last_run_at_from === "string" ||
    typeof bodyAny.last_run_at_to === "string"
  ) {
    whereInput.last_run_at = {};
    if (typeof bodyAny.last_run_at_from === "string") {
      whereInput.last_run_at.gte = bodyAny.last_run_at_from;
    }
    if (typeof bodyAny.last_run_at_to === "string") {
      whereInput.last_run_at.lte = bodyAny.last_run_at_to;
    }
  }
  if (
    typeof bodyAny.created_at_from === "string" ||
    typeof bodyAny.created_at_to === "string"
  ) {
    whereInput.created_at = {};
    if (typeof bodyAny.created_at_from === "string") {
      whereInput.created_at.gte = bodyAny.created_at_from;
    }
    if (typeof bodyAny.created_at_to === "string") {
      whereInput.created_at.lte = bodyAny.created_at_to;
    }
  }
  const orderByInput: Prisma.discussion_board_scheduled_tasksOrderByWithRelationInput =
    {};
  if (
    bodyAny.sort_by_last_run_at === "asc" ||
    bodyAny.sort_by_last_run_at === "desc"
  ) {
    orderByInput.last_run_at = bodyAny.sort_by_last_run_at;
  }
  if (
    bodyAny.sort_by_created_at === "asc" ||
    bodyAny.sort_by_created_at === "desc"
  ) {
    orderByInput.created_at = bodyAny.sort_by_created_at;
  }
  const total = await MyGlobal.prisma.discussion_board_scheduled_tasks.count({
    where: whereInput,
  });
  const skip = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.discussion_board_scheduled_tasks.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
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
  const data: IDiscussionBoardScheduledTask.ISummary[] = records.map(
    (record) => ({
      id: record.id,
      task_name: record.task_name,
      schedule_pattern: record.schedule_pattern,
      last_run_at: record.last_run_at
        ? toISOStringSafe(record.last_run_at)
        : null,
      status: record.status,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
