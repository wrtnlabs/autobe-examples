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
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 100 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const skip = (page - 1) * limit;
  const whereCondition = {
    deleted_at: null as null,
  } satisfies Prisma.discussion_board_scheduled_tasksWhereInput;
  const orderByCondition = [
    { last_run_at: "desc" as const },
    { created_at: "desc" as const },
  ] satisfies Prisma.discussion_board_scheduled_tasksOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.discussion_board_scheduled_tasks.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: orderByCondition,
    select: {
      task_name: true,
      schedule_pattern: true,
      last_run_at: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_scheduled_tasks.count({
    where: whereCondition,
  });
  return {
    data: data.map((record) => ({
      task_name: record.task_name,
      schedule_pattern: record.schedule_pattern,
      last_run_at: record.last_run_at
        ? (toISOStringSafe(record.last_run_at) as string &
            tags.Format<"date-time">)
        : null,
      status: record.status,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.updated_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
  };
}
