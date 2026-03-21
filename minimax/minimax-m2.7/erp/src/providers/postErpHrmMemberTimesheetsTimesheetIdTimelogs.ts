import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
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
  body: IErpHrmTimesheetTimelog.IAddRequest;
}): Promise<IErpHrmTimesheet> {
  // Step 1: Fetch timesheet and verify it exists
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      week_start_date: true,
      week_end_date: true,
      status: true,
    },
  });
  // Step 2: Validate timesheet is in draft status
  if (timesheet.status !== "draft") {
    throw new HttpException(
      `Cannot add timelog to timesheet with status '${timesheet.status}'. Only draft timesheets can accept new timelogs.`,
      400,
    );
  }
  // Step 3: Fetch timelog and verify it exists
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.body.erp_hrm_timelog_id },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      date: true,
      duration_minutes: true,
    },
  });
  // Step 4: Validate timelog belongs to the same employee as the timesheet
  if (timelog.erp_hrm_employee_id !== timesheet.erp_hrm_employee_id) {
    throw new HttpException(
      "Forbidden: Timelog does not belong to the timesheet owner",
      403,
    );
  }
  // Step 5: Validate timelog date falls within timesheet week (inclusive)
  const timelogDate = new Date(timelog.date);
  const weekStart = new Date(timesheet.week_start_date);
  const weekEnd = new Date(timesheet.week_end_date);
  // Set times to start/end of day for proper comparison
  weekStart.setHours(0, 0, 0, 0);
  weekEnd.setHours(23, 59, 59, 999);
  if (timelogDate < weekStart || timelogDate > weekEnd) {
    throw new HttpException(
      `Timelog date must fall within the timesheet week (${timesheet.week_start_date.toISOString()} to ${timesheet.week_end_date.toISOString()}).`,
      400,
    );
  }
  // Step 6: Check if timelog is already in another submitted or approved timesheet
  const existingInOtherTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findFirst({
      where: {
        erp_hrm_timelog_id: props.body.erp_hrm_timelog_id,
        erp_hrm_timesheet_id: { not: props.timesheetId },
        timesheet: {
          status: { in: ["submitted", "approved"] },
        },
      },
    });
  if (existingInOtherTimesheet) {
    throw new HttpException(
      "Timelog is already associated with another submitted or approved timesheet.",
      400,
    );
  }
  // Step 7: Check if timelog is already in this timesheet (prevent duplicates)
  const existingInThisTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findFirst({
      where: {
        erp_hrm_timelog_id: props.body.erp_hrm_timelog_id,
        erp_hrm_timesheet_id: props.timesheetId,
      },
    });
  if (existingInThisTimesheet) {
    throw new HttpException(
      "Timelog is already associated with this timesheet.",
      400,
    );
  }
  // Step 8: Create the junction record
  const junctionId = v4();
  await MyGlobal.prisma.erp_hrm_timesheet_timelogs.create({
    data: {
      id: junctionId,
      erp_hrm_timesheet_id: props.timesheetId,
      erp_hrm_timelog_id: props.body.erp_hrm_timelog_id,
      added_at: new Date(),
    },
  });
  // Step 9: Recalculate total_hours from all timelogs in this timesheet
  const allTimelogs = await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany(
    {
      where: { erp_hrm_timesheet_id: props.timesheetId },
      select: {
        timelog: {
          select: { duration_minutes: true },
        },
      },
    },
  );
  const totalMinutes = allTimelogs.reduce(
    (sum, item) => sum + item.timelog.duration_minutes,
    0,
  );
  const totalHours = totalMinutes / 60;
  // Step 10: Update timesheet with new total_hours
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      total_hours: totalHours,
      updated_at: new Date(),
    },
  });
  // Step 11: Fetch updated timesheet with full relations for response
  const updatedTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimesheetTransformer.select(),
    });
  // Step 12: Return transformed response
  return ErpHrmTimesheetTransformer.transform(updatedTimesheet);
}
