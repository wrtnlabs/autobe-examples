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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodosTrashCleanupLogs(props: {
  user: UserPayload;
  body: ITodoAppTrashCleanupLog.IRequest;
}): Promise<IPageITodoAppTrashCleanupLog.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limitValue = props.body.limit ?? 100;
  const limit = Math.min(Math.max(limitValue, 1), 100);
  const skip = (page - 1) * limit;
  // Build dynamic WHERE conditions based on filter parameters
  const whereInput: Prisma.todo_app_trash_cleanup_logsWhereInput = {
    // Filter by user ownership through trashItem -> user relationship
    trashItem: {
      user: {
        id: props.user.id,
      },
    },
    // Add filter conditions based on request body
    ...(props.body.operation_type && {
      operation_type: { equals: props.body.operation_type },
    }),
    ...(props.body.operation_status && {
      operation_status: { equals: props.body.operation_status },
    }),
    // Date range filtering - convert string dates to Date objects for Prisma
    ...(props.body.started_at_from && {
      started_at: {
        gte: new Date(props.body.started_at_from),
      },
    }),
    ...(props.body.started_at_to && {
      started_at: {
        lte: new Date(props.body.started_at_to),
      },
    }),
    ...(props.body.completed_at_from &&
      props.body.completed_at_from !== null && {
        completed_at: {
          gte: new Date(props.body.completed_at_from),
        },
      }),
    ...(props.body.completed_at_to &&
      props.body.completed_at_to !== null && {
        completed_at: {
          lte: new Date(props.body.completed_at_to),
        },
      }),
  };
  // Determine sort order
  const orderBy: Prisma.todo_app_trash_cleanup_logsOrderByWithRelationInput =
    props.body.sort === "started_at_asc"
      ? { started_at: "asc" }
      : { started_at: "desc" };
  // Fetch paginated cleanup logs with filters
  const cleanupLogs =
    await MyGlobal.prisma.todo_app_trash_cleanup_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy,
    });
  // Get total count for pagination
  const totalRecords = await MyGlobal.prisma.todo_app_trash_cleanup_logs.count({
    where: whereInput,
  });
  // Transform cleanup logs to match summary DTO
  const summaries: ITodoAppTrashCleanupLog.ISummary[] = cleanupLogs.map(
    (log) => ({
      id: log.id as string & tags.Format<"uuid">,
      operation_type: log.operation_type,
      items_processed: log.items_processed,
      items_deleted: log.items_deleted,
      cleanup_criteria: log.cleanup_criteria,
      operation_status: log.operation_status,
      started_at:
        typeof log.started_at === "string"
          ? log.started_at
          : toISOStringSafe(log.started_at),
      completed_at: log.completed_at
        ? typeof log.completed_at === "string"
          ? log.completed_at
          : toISOStringSafe(log.completed_at)
        : null,
    }),
  );
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    } satisfies IPage.IPagination,
    data: summaries,
  };
}
