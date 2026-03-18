import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimelogAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingEmployeeTimelogs(props: {
  employee: EmployeePayload;
  body: IHrmTimeTrackingTimelog.IRequest;
}): Promise<IPageIHrmTimeTrackingTimelog.ISummary> {
  if (
    props.body.hrm_time_tracking_project_id !== undefined &&
    props.body.hrm_time_tracking_task_id !== undefined
  ) {
    const task =
      await MyGlobal.prisma.hrm_time_tracking_tasks.findUniqueOrThrow({
        where: {
          id: props.body.hrm_time_tracking_task_id,
        },
        select: {
          id: true,
          hrm_time_tracking_project_id: true,
          deleted_at: true,
        },
      });
    if (task.deleted_at !== null) {
      throw new HttpException("Task not found", 404);
    }
    if (
      task.hrm_time_tracking_project_id !==
      props.body.hrm_time_tracking_project_id
    ) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderByInput =
    props.body.sort === undefined || props.body.sort === "worked_on_desc"
      ? ([
          { worked_on: "desc" },
          { created_at: "desc" },
        ] satisfies Prisma.hrm_time_tracking_timelogsOrderByWithRelationInput[])
      : props.body.sort === "worked_on_asc"
        ? ([
            { worked_on: "asc" },
            { created_at: "asc" },
          ] satisfies Prisma.hrm_time_tracking_timelogsOrderByWithRelationInput[])
        : props.body.sort === "created_at_desc"
          ? ([
              { created_at: "desc" },
              { id: "desc" },
            ] satisfies Prisma.hrm_time_tracking_timelogsOrderByWithRelationInput[])
          : props.body.sort === "created_at_asc"
            ? ([
                { created_at: "asc" },
                { id: "asc" },
              ] satisfies Prisma.hrm_time_tracking_timelogsOrderByWithRelationInput[])
            : props.body.sort === "duration_minutes_desc"
              ? ([
                  { duration_minutes: "desc" },
                  { worked_on: "desc" },
                  { created_at: "desc" },
                ] satisfies Prisma.hrm_time_tracking_timelogsOrderByWithRelationInput[])
              : props.body.sort === "duration_minutes_asc"
                ? ([
                    { duration_minutes: "asc" },
                    { worked_on: "asc" },
                    { created_at: "asc" },
                  ] satisfies Prisma.hrm_time_tracking_timelogsOrderByWithRelationInput[])
                : null;
  if (orderByInput === null) {
    throw new HttpException("Unsupported sort option", 400);
  }
  const whereInput = {
    deleted_at: null,
    hrm_time_tracking_employee_id: props.employee.id,
    ...(props.body.search !== undefined
      ? {
          description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.worked_from !== undefined ||
    props.body.worked_to !== undefined
      ? {
          worked_on: {
            ...(props.body.worked_from !== undefined
              ? { gte: props.body.worked_from }
              : {}),
            ...(props.body.worked_to !== undefined
              ? { lte: props.body.worked_to }
              : {}),
          },
        }
      : {}),
    ...(props.body.hrm_time_tracking_project_id !== undefined
      ? {
          hrm_time_tracking_project_id: props.body.hrm_time_tracking_project_id,
        }
      : {}),
    ...(props.body.hrm_time_tracking_task_id !== undefined
      ? {
          hrm_time_tracking_task_id: props.body.hrm_time_tracking_task_id,
        }
      : {}),
    ...(props.body.billable !== undefined
      ? {
          billable: props.body.billable,
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_timelogsWhereInput;
  const records = await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmTimeTrackingTimelogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_timelogs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingTimelogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
