import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTaskHistoryAtSummaryTransformer } from "../transformers/HrmTimeTrackingTaskHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingProjectsProjectIdTasksTaskIdHistories(props: {
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTaskHistory.IRequest;
}): Promise<IPageIHrmTimeTrackingTaskHistory.ISummary> {
  await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      hrm_time_tracking_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    hrm_time_tracking_task_id: props.taskId,
    deleted_at: null,
    ...(props.body.actorType !== undefined
      ? { actor_type: props.body.actorType }
      : {}),
    ...(props.body.oldStatus !== undefined
      ? { old_status: props.body.oldStatus }
      : {}),
    ...(props.body.newStatus !== undefined
      ? { new_status: props.body.newStatus }
      : {}),
    ...(props.body.changedAtFrom !== undefined ||
    props.body.changedAtTo !== undefined
      ? {
          changed_at: {
            ...(props.body.changedAtFrom !== undefined
              ? { gte: props.body.changedAtFrom }
              : {}),
            ...(props.body.changedAtTo !== undefined
              ? { lte: props.body.changedAtTo }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_task_historiesWhereInput;
  const orderBy = (
    props.body.sort === "changed_at_asc"
      ? [{ changed_at: "asc" }, { id: "asc" }]
      : props.body.sort === "changed_at_desc"
        ? [{ changed_at: "desc" }, { id: "desc" }]
        : props.body.sort === "created_at_asc"
          ? [{ created_at: "asc" }, { id: "asc" }]
          : props.body.sort === "created_at_desc"
            ? [{ created_at: "desc" }, { id: "desc" }]
            : [{ changed_at: "desc" }, { id: "desc" }]
  ) satisfies Prisma.hrm_time_tracking_task_historiesOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.hrm_time_tracking_task_histories.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...HrmTimeTrackingTaskHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_task_histories.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingTaskHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
