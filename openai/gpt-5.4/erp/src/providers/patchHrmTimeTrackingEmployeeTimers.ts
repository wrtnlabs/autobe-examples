import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimerAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingEmployeeTimers(props: {
  employee: EmployeePayload;
  body: IHrmTimeTrackingTimer.IRequest;
}): Promise<IPageIHrmTimeTrackingTimer.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    deleted_at: null,
    hrm_time_tracking_employee_id: props.employee.id,
    ...(props.body.hrmTimeTrackingEmployeeId !== undefined && {
      hrm_time_tracking_employee_id: props.employee.id,
    }),
    ...(props.body.hrmTimeTrackingProjectId !== undefined && {
      hrm_time_tracking_project_id: props.body.hrmTimeTrackingProjectId,
    }),
    ...(props.body.hrmTimeTrackingTaskId !== undefined
      ? {
          hrm_time_tracking_task_id: props.body.hrmTimeTrackingTaskId,
        }
      : props.body.taskAssigned !== undefined
        ? {
            hrm_time_tracking_task_id: props.body.taskAssigned
              ? { not: null }
              : null,
          }
        : {}),
    ...(props.body.search !== undefined && {
      description: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...((props.body.startedAtFrom !== undefined ||
      props.body.startedAtTo !== undefined) && {
      started_at: {
        ...(props.body.startedAtFrom !== undefined && {
          gte: props.body.startedAtFrom,
        }),
        ...(props.body.startedAtTo !== undefined && {
          lte: props.body.startedAtTo,
        }),
      },
    }),
    ...((props.body.createdAtFrom !== undefined ||
      props.body.createdAtTo !== undefined) && {
      created_at: {
        ...(props.body.createdAtFrom !== undefined && {
          gte: props.body.createdAtFrom,
        }),
        ...(props.body.createdAtTo !== undefined && {
          lte: props.body.createdAtTo,
        }),
      },
    }),
    ...((props.body.updatedAtFrom !== undefined ||
      props.body.updatedAtTo !== undefined) && {
      updated_at: {
        ...(props.body.updatedAtFrom !== undefined && {
          gte: props.body.updatedAtFrom,
        }),
        ...(props.body.updatedAtTo !== undefined && {
          lte: props.body.updatedAtTo,
        }),
      },
    }),
  } satisfies Prisma.hrm_time_tracking_timersWhereInput;
  const direction: "asc" | "desc" = props.body.sortDirection ?? "desc";
  const orderBy =
    props.body.sortBy === "createdAt"
      ? ({
          created_at: direction,
        } satisfies Prisma.hrm_time_tracking_timersOrderByWithRelationInput)
      : props.body.sortBy === "updatedAt"
        ? ({
            updated_at: direction,
          } satisfies Prisma.hrm_time_tracking_timersOrderByWithRelationInput)
        : props.body.sortBy === "description"
          ? ({
              description: direction,
            } satisfies Prisma.hrm_time_tracking_timersOrderByWithRelationInput)
          : ({
              started_at: direction,
            } satisfies Prisma.hrm_time_tracking_timersOrderByWithRelationInput);
  const records = await MyGlobal.prisma.hrm_time_tracking_timers.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...HrmTimeTrackingTimerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_timers.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingTimerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
