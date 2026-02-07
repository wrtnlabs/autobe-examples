import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTrashCleanupLog";
import { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTrashCleanupLogAtSummaryTransformer } from "../transformers/TodoAppTrashCleanupLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTrashCleanupLogs(props: {
  user: UserPayload;
  body: ITodoAppTrashCleanupLog.IRequest;
}): Promise<IPageITodoAppTrashCleanupLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereInput = {
    ...(props.body.operation_type && {
      operation_type: props.body.operation_type,
    }),
    ...(props.body.operation_status && {
      operation_status: props.body.operation_status,
    }),
    ...(props.body.started_at_range && {
      started_at: {
        gte: props.body.started_at_range.start,
        lte: props.body.started_at_range.end,
      },
    }),
    ...(props.body.completed_at_range && {
      OR: [
        {
          completed_at: {
            gte: props.body.completed_at_range.start,
            lte: props.body.completed_at_range.end,
          },
        },
        ...(props.body.completed_at_range.start === null ||
        props.body.completed_at_range.end === null
          ? [{ completed_at: null }]
          : []),
      ],
    }),
    ...(props.body.cleanup_criteria && {
      cleanup_criteria: {
        contains: props.body.cleanup_criteria,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.todo_app_trash_cleanup_logsWhereInput;
  // Execute queries sequentially as per guidelines
  const data = await MyGlobal.prisma.todo_app_trash_cleanup_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { started_at: "desc" },
    ...TodoAppTrashCleanupLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_trash_cleanup_logs.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppTrashCleanupLogAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
