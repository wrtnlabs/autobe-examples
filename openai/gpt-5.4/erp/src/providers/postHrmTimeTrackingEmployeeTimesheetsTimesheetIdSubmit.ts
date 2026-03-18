import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingEmployeeTimesheetsTimesheetIdSubmit(props: {
  employee: EmployeePayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        week_start_date: true,
        status: true,
      },
    });
  if (timesheet.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status !== "draft") {
    throw new HttpException("Only draft timesheets can be submitted", 409);
  }
  const inclusionCount =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_timelogs.count({
      where: {
        hrm_time_tracking_timesheet_id: props.timesheetId,
        deleted_at: null,
        timelog: {
          deleted_at: null,
        },
      },
    });
  if (inclusionCount === 0) {
    throw new HttpException("Timesheet must contain at least one timelog", 400);
  }
  const conflicting =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        id: {
          not: props.timesheetId,
        },
        hrm_time_tracking_employee_id: timesheet.hrm_time_tracking_employee_id,
        week_start_date: timesheet.week_start_date,
        deleted_at: null,
        status: {
          in: ["submitted", "approved"],
        },
      },
      select: {
        id: true,
      },
    });
  if (conflicting !== null) {
    throw new HttpException(
      "Another timesheet for this week is already submitted or approved",
      409,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.hrm_time_tracking_timesheets.update({
      where: {
        id: props.timesheetId,
      },
      data: {
        status: "submitted",
        submitted_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
  return await HrmTimeTrackingTimesheetTransformer.transform(updated);
}
