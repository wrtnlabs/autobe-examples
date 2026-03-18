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

export async function patchHrmTimeTrackingEmployeeTimesheetsTimesheetIdTimelogs(props: {
  employee: EmployeePayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimelog.IRequest;
}): Promise<IPageIHrmTimeTrackingTimelog.ISummary> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
      },
    });
  if (timesheet.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const timelogWhereInput = {
    deleted_at: null,
    hrm_time_tracking_employee_id: timesheet.hrm_time_tracking_employee_id,
    ...(props.body.search !== undefined && props.body.search.length !== 0
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
    ...(props.body.billable !== undefined
      ? {
          billable: props.body.billable,
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
  } satisfies Prisma.hrm_time_tracking_timelogsWhereInput;
  const whereInput = {
    hrm_time_tracking_timesheet_id: props.timesheetId,
    deleted_at: null,
    timelog: timelogWhereInput,
  } satisfies Prisma.hrm_time_tracking_timesheet_timelogsWhereInput;
  const orderByInput = (
    props.body.sort === "worked_on_asc"
      ? [
          { timelog: { worked_on: "asc" } },
          { timelog: { created_at: "asc" } },
          { timelog: { id: "asc" } },
        ]
      : props.body.sort === "created_at_asc"
        ? [{ timelog: { created_at: "asc" } }, { timelog: { id: "asc" } }]
        : props.body.sort === "created_at_desc"
          ? [{ timelog: { created_at: "desc" } }, { timelog: { id: "desc" } }]
          : props.body.sort === "duration_minutes_asc"
            ? [
                { timelog: { duration_minutes: "asc" } },
                { timelog: { worked_on: "asc" } },
                { timelog: { id: "asc" } },
              ]
            : props.body.sort === "duration_minutes_desc"
              ? [
                  { timelog: { duration_minutes: "desc" } },
                  { timelog: { worked_on: "desc" } },
                  { timelog: { id: "desc" } },
                ]
              : [
                  { timelog: { worked_on: "desc" } },
                  { timelog: { created_at: "desc" } },
                  { timelog: { id: "desc" } },
                ]
  ) satisfies Prisma.hrm_time_tracking_timesheet_timelogsOrderByWithRelationInput[];
  const rows =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_timelogs.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        timelog: HrmTimeTrackingTimelogAtSummaryTransformer.select(),
      },
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_timelogs.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(rows, async (row) =>
      HrmTimeTrackingTimelogAtSummaryTransformer.transform(row.timelog),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
