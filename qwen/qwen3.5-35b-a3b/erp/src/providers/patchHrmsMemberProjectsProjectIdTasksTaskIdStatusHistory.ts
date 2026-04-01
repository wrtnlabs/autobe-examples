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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const cursor = props.body.cursor;
  const reverse = props.body.reverse ?? false;
  await MyGlobal.prisma.hrms_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      hrms_project_id: props.projectId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const baseWhere = {
    hrms_task_id: props.taskId,
    deleted_at: null,
  } satisfies Prisma.hrms_task_status_historiesWhereInput;
  const whereCondition: Prisma.hrms_task_status_historiesWhereInput = {
    ...baseWhere,
  };
  if (
    props.body.startDate !== undefined ||
    props.body.endDate !== undefined ||
    cursor !== undefined
  ) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.startDate !== undefined) {
      createdAtFilter.gte = new Date(props.body.startDate);
    }
    if (props.body.endDate !== undefined) {
      createdAtFilter.lte = new Date(props.body.endDate);
    }
    if (cursor !== undefined) {
      if (reverse) {
        createdAtFilter.gt = new Date(cursor);
      } else {
        createdAtFilter.lt = new Date(cursor);
      }
    }
    whereCondition.created_at = createdAtFilter;
  }
  if (props.body.newStatus !== undefined) {
    whereCondition.new_status = props.body.newStatus;
  }
  const orderByCondition = reverse
    ? { created_at: "asc" as const }
    : { created_at: "desc" as const };
  const takeValue = cursor !== undefined ? limit + 1 : limit;
  const data = await MyGlobal.prisma.hrms_task_status_histories.findMany({
    where: whereCondition,
    skip: cursor === undefined ? skip : undefined,
    take: takeValue,
    orderBy: orderByCondition,
    ...HrmsTaskStatusHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrms_task_status_histories.count({
    where: whereCondition,
  });
  let finalData = data;
  if (cursor !== undefined) {
    if (data.length > limit) {
      finalData = data.slice(0, limit);
    }
  }
  const hasMore = cursor !== undefined && data.length > limit;
  return {
    data: await ArrayUtil.asyncMap(
      finalData,
      HrmsTaskStatusHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
