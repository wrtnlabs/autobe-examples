import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTaskStatusHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTaskStatusHistoryAtSummaryTransformer } from "../transformers/HrmsTaskStatusHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberProjectsProjectIdTasksTaskIdStatusHistory(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmsTaskStatusHistory.IRequest;
}): Promise<IPageIHrmsTaskStatusHistory.ISummary> {
  // Verify task exists and belongs to the specified project
  const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      hrms_project_id: props.projectId,
    },
    select: {
      id: true,
      hrms_project_id: true,
    },
  });
  // Build filter WHERE clause
  const whereClause: Prisma.hrms_task_status_historiesWhereInput = {
    hrms_task_id: props.taskId,
    deleted_at: null,
    ...(props.body.startDate !== undefined && {
      created_at: {
        gte: props.body.startDate as string & tags.Format<"date-time">,
      },
    }),
    ...(props.body.endDate !== undefined && {
      created_at: {
        lte: props.body.endDate as string & tags.Format<"date-time">,
      },
    }),
    ...(props.body.newStatus !== undefined && {
      new_status: props.body.newStatus,
    }),
  };
  // Build pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const safeLimit = limit > 100 ? 100 : limit < 1 ? 1 : limit;
  const skip = (page - 1) * limit;
  // Build cursor-based pagination if cursor provided
  const cursorInput: Prisma.hrms_task_status_historiesWhereInput = props.body
    .cursor
    ? {
        ...whereClause,
        created_at: props.body.reverse
          ? { gt: props.body.cursor as string & tags.Format<"date-time"> }
          : { lt: props.body.cursor as string & tags.Format<"date-time"> },
      }
    : whereClause;
  // Build orderBy
  const orderBy: Prisma.hrms_task_status_historiesOrderByWithRelationInput = {
    created_at: props.body.reverse ? ("asc" as const) : ("desc" as const),
  };
  // Query history entries
  const take = props.body.cursor ? safeLimit : safeLimit;
  const data = await MyGlobal.prisma.hrms_task_status_histories.findMany({
    where: cursorInput,
    orderBy,
    take,
    skip: props.body.cursor ? undefined : skip,
    ...HrmsTaskStatusHistoryAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.hrms_task_status_histories.count({
    where: whereClause,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmsTaskStatusHistoryAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const pagination: IPage.IPagination = {
    current: props.body.cursor ? 0 : page,
    limit: safeLimit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / safeLimit),
  };
  return {
    data: transformedData,
    pagination,
  };
}
