import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimesheetAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingEmployeeTimesheets(props: {
  employee: EmployeePayload;
  body: IHrmTimeTrackingTimesheet.IRequest;
}): Promise<IPageIHrmTimeTrackingTimesheet.ISummary> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: {
        id: props.employee.id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (employee.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  if (
    props.body.weekStartDateFrom !== undefined &&
    props.body.weekStartDateTo !== undefined &&
    props.body.weekStartDateFrom > props.body.weekStartDateTo
  ) {
    throw new HttpException("Invalid week start date range", 400);
  }
  if (
    props.body.weekEndDateFrom !== undefined &&
    props.body.weekEndDateTo !== undefined &&
    props.body.weekEndDateFrom > props.body.weekEndDateTo
  ) {
    throw new HttpException("Invalid week end date range", 400);
  }
  const where = {
    deleted_at: null,
    hrm_time_tracking_employee_id: props.employee.id,
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...((props.body.weekStartDateFrom !== undefined ||
      props.body.weekStartDateTo !== undefined) && {
      week_start_date: {
        ...(props.body.weekStartDateFrom !== undefined && {
          gte: props.body.weekStartDateFrom,
        }),
        ...(props.body.weekStartDateTo !== undefined && {
          lte: props.body.weekStartDateTo,
        }),
      },
    }),
    ...((props.body.weekEndDateFrom !== undefined ||
      props.body.weekEndDateTo !== undefined) && {
      week_end_date: {
        ...(props.body.weekEndDateFrom !== undefined && {
          gte: props.body.weekEndDateFrom,
        }),
        ...(props.body.weekEndDateTo !== undefined && {
          lte: props.body.weekEndDateTo,
        }),
      },
    }),
  } satisfies Prisma.hrm_time_tracking_timesheetsWhereInput;
  const data = await MyGlobal.prisma.hrm_time_tracking_timesheets.findMany({
    where,
    skip,
    take: limit,
    orderBy: [
      {
        week_start_date: "desc",
      },
      {
        id: "desc",
      },
    ],
    ...HrmTimeTrackingTimesheetAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_timesheets.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingTimesheetAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
