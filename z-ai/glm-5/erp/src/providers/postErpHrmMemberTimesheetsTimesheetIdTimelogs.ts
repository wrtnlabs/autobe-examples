import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimesheet.IAddTimelog;
}): Promise<IErpHrmTimesheet> {
  // 1. Fetch timesheet with employee to verify ownership
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      employee_id: true,
      week_start_date: true,
      week_end_date: true,
      status: true,
      employee: {
        select: {
          id: true,
          erp_hrm_member_id: true,
          status: true,
        },
      },
    },
  });
  // 2. Verify timesheet belongs to current member
  if (timesheet.employee.erp_hrm_member_id !== props.member.id) {
    throw new HttpException("Timesheet does not belong to current member", 403);
  }
  // 3. Verify timesheet status is draft
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet is not in draft status", 403);
  }
  // 4. Process each timelog
  for (const timelogId of props.body.timelogIds) {
    // Fetch timelog with its timesheet associations
    const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
      where: { id: timelogId },
      select: {
        id: true,
        employee_id: true,
        date: true,
        timesheetTimelogs: {
          select: {
            timesheet_id: true,
            timesheet: {
              select: { status: true },
            },
          },
        },
      },
    });
    // Verify timelog belongs to same employee
    if (timelog.employee_id !== timesheet.employee_id) {
      throw new HttpException(
        "Timelog does not belong to the same employee",
        400,
      );
    }
    // Verify timelog date is within week range
    if (
      timelog.date < timesheet.week_start_date ||
      timelog.date > timesheet.week_end_date
    ) {
      throw new HttpException(
        "Timelog date is outside the timesheet week range",
        400,
      );
    }
    // Verify timelog is not in any submitted/approved timesheet
    const inActiveTimesheet = timelog.timesheetTimelogs.some(
      (tt) =>
        tt.timesheet.status === "submitted" ||
        tt.timesheet.status === "approved",
    );
    if (inActiveTimesheet) {
      throw new HttpException(
        "Timelog is already included in another submitted/approved timesheet",
        400,
      );
    }
    // Verify timelog is not already in this timesheet
    const inThisTimesheet = timelog.timesheetTimelogs.some(
      (tt) => tt.timesheet_id === props.timesheetId,
    );
    if (inThisTimesheet) {
      throw new HttpException("Timelog already exists in this timesheet", 400);
    }
    // Create junction record
    await MyGlobal.prisma.erp_hrm_timesheet_timelogs.create({
      data: {
        id: v4(),
        timesheet_id: props.timesheetId,
        timelog_id: timelogId,
        created_at: new Date(),
      },
    });
  }
  // 5. Recalculate total_hours
  const allTimelogs = await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany(
    {
      where: { timesheet_id: props.timesheetId },
      select: {
        timelog: { select: { duration: true } },
      },
    },
  );
  const totalHours = allTimelogs.reduce(
    (sum, tt) => sum + tt.timelog.duration / 60,
    0,
  );
  // 6. Update timesheet
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      total_hours: totalHours,
      updated_at: new Date(),
    },
  });
  // 7. Return updated timesheet using transformer
  const updated = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return ErpHrmTimesheetTransformer.transform(updated);
}
