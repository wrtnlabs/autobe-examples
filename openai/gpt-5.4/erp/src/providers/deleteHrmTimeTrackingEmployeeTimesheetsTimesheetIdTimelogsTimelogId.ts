import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingEmployeeTimesheetsTimesheetIdTimelogsTimelogId(props: {
  employee: EmployeePayload;
  timesheetId: string & tags.Format<"uuid">;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        hrm_time_tracking_employee_id: true,
        status: true,
      },
    });
  const timelog =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findFirstOrThrow({
      where: {
        id: props.timelogId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        hrm_time_tracking_employee_id: true,
      },
    });
  const timesheetTimelog =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_timelogs.findFirstOrThrow(
      {
        where: {
          hrm_time_tracking_timesheet_id: props.timesheetId,
          hrm_time_tracking_timelog_id: props.timelogId,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      },
    );
  if (
    timesheet.hrm_time_tracking_organization_id !==
    timelog.hrm_time_tracking_organization_id
  ) {
    throw new HttpException(
      "Invalid timesheet and timelog organization scope",
      400,
    );
  }
  if (timesheet.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timelog.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status === "submitted" || timesheet.status === "approved") {
    throw new HttpException(
      "Timelog cannot be deleted from a submitted or approved timesheet",
      403,
    );
  }
  const now = toISOStringSafe(new globalThis.Date());
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.hrm_time_tracking_timesheet_timelogs.update({
      where: {
        id: timesheetTimelog.id,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    await prisma.hrm_time_tracking_timelogs.update({
      where: {
        id: props.timelogId,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
}
