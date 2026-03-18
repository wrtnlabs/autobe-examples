import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { IHrmTimeTrackingTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTimesheetTimelogCollector } from "../collectors/HrmTimeTrackingTimesheetTimelogCollector";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingEmployeeTimesheetsTimesheetIdTimelogs(props: {
  employee: EmployeePayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimesheetTimelog.ICreate;
}): Promise<IHrmTimeTrackingTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        hrm_time_tracking_organization_id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        deleted_at: true,
      },
    });
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (timesheet.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status !== "draft") {
    throw new HttpException("Only draft timesheets can be edited", 409);
  }
  const timelog =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findUniqueOrThrow({
      where: {
        id: props.body.hrm_time_tracking_timelog_id,
      },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        hrm_time_tracking_organization_id: true,
        worked_on: true,
        deleted_at: true,
      },
    });
  if (timelog.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (
    timelog.hrm_time_tracking_organization_id !==
    timesheet.hrm_time_tracking_organization_id
  ) {
    throw new HttpException("Timelog belongs to a different organization", 400);
  }
  if (
    timelog.hrm_time_tracking_employee_id !==
    timesheet.hrm_time_tracking_employee_id
  ) {
    throw new HttpException("Timelog belongs to a different employee", 400);
  }
  if (
    timelog.worked_on < timesheet.week_start_date ||
    timelog.worked_on > timesheet.week_end_date
  ) {
    throw new HttpException("Timelog is outside the timesheet week", 400);
  }
  const existing =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_timelogs.findFirst({
      where: {
        hrm_time_tracking_timelog_id: props.body.hrm_time_tracking_timelog_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException("Timelog is already attached to a timesheet", 409);
  }
  try {
    await MyGlobal.prisma.$transaction(async (prisma) => {
      await prisma.hrm_time_tracking_timesheet_timelogs.create({
        data: await HrmTimeTrackingTimesheetTimelogCollector.collect({
          body: props.body,
          timesheet: {
            id: timesheet.id,
          },
        }),
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Timelog is already attached to a timesheet",
        409,
      );
    }
    throw error;
  }
  const refreshed =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
  return await HrmTimeTrackingTimesheetTransformer.transform(refreshed);
}
