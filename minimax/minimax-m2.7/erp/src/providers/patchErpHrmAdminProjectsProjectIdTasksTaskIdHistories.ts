import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmTaskHistoryAtSummaryTransformer } from "../transformers/ErpHrmTaskHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminProjectsProjectIdTasksTaskIdHistories(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTaskHistory.IRequest;
}): Promise<IPageIErpHrmTaskHistory.ISummary> {
  // 1. Verify task exists and belongs to the specified project
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      erp_hrm_project_id: true,
    },
  });
  // Verify the task belongs to the specified project
  if (task.erp_hrm_project_id !== props.projectId) {
    throw new HttpException(
      "Task does not belong to the specified project",
      400,
    );
  }
  // 2. Build WHERE clause from request filters
  const whereClause = {
    erp_hrm_task_id: props.taskId,
    ...(props.body.previous_status !== undefined && {
      previous_status: props.body.previous_status,
    }),
    ...(props.body.new_status !== undefined && {
      new_status: props.body.new_status,
    }),
    ...(props.body.created_at_after !== undefined && {
      created_at: {
        gt: new Date(props.body.created_at_after),
      },
    }),
    ...(props.body.created_at_before !== undefined && {
      created_at: {
        lt: new Date(props.body.created_at_before),
      },
    }),
  } satisfies Prisma.erp_hrm_task_historiesWhereInput;
  // 3. Determine pagination parameters
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  // Cursor-based pagination mode
  if (props.body.cursor !== undefined) {
    const cursorDate = new Date(props.body.cursor);
    const cursorWhereClause = {
      ...whereClause,
      created_at: {
        gt: cursorDate,
      },
    } satisfies Prisma.erp_hrm_task_historiesWhereInput;
    // Fetch one extra to determine if there are more records
    const histories = await MyGlobal.prisma.erp_hrm_task_histories.findMany({
      where: cursorWhereClause,
      take: limit + 1,
      orderBy: { created_at: "asc" },
      ...ErpHrmTaskHistoryAtSummaryTransformer.select(),
    });
    const hasMore = histories.length > limit;
    const resultRecords = hasMore ? histories.slice(0, limit) : histories;
    const lastRecord = resultRecords[resultRecords.length - 1];
    const nextCursor = hasMore
      ? (lastRecord?.created_at.toISOString() ?? null)
      : null;
    return {
      pagination: {
        current: page,
        limit: limit,
        records: resultRecords.length,
        pages: hasMore ? page + 1 : page,
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        resultRecords,
        ErpHrmTaskHistoryAtSummaryTransformer.transform,
      ),
    };
  }
  // Page-based pagination mode
  const skip = (page - 1) * limit;
  const [histories, total] = await Promise.all([
    MyGlobal.prisma.erp_hrm_task_histories.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { created_at: "asc" },
      ...ErpHrmTaskHistoryAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.erp_hrm_task_histories.count({
      where: whereClause,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      histories,
      ErpHrmTaskHistoryAtSummaryTransformer.transform,
    ),
  };
}
