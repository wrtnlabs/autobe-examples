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

export async function postErpHrmMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimesheet.ICreate;
}): Promise<IErpHrmTimesheet> {
  // 1. Look up the employee by member_id from the session
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // 2. Check for duplicate timesheet (employee_id + week_start_date unique)
  const existingTimesheet = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      erp_hrm_employee_id: employee.id,
      week_start_date: new Date(props.body.week_start_date),
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (existingTimesheet) {
    if (
      existingTimesheet.status === "submitted" ||
      existingTimesheet.status === "approved"
    ) {
      throw new HttpException(
        "Timesheet already exists for this week with conflicting status",
        409,
      );
    }
    // If draft or rejected, return the existing draft
    const existing = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow(
      {
        where: { id: existingTimesheet.id },
        ...ErpHrmTimesheetTransformer.select(),
      },
    );
    return await ErpHrmTimesheetTransformer.transform(existing);
  }
  // 3. Create the timesheet
  const timesheetId = v4();
  const weekStartDate = new Date(props.body.week_start_date);
  const weekEndDate = new Date(props.body.week_end_date);
  await MyGlobal.prisma.erp_hrm_timesheets.create({
    data: {
      id: timesheetId,
      erp_hrm_employee_id: employee.id,
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      status: "draft",
      total_hours: 0,
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 4. Find timelogs in the date range that aren't already in another timesheet
  const eligibleTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      erp_hrm_employee_id: employee.id,
      date: {
        gte: weekStartDate,
        lte: weekEndDate,
      },
      timelogTimesheets: {
        none: {},
      },
    },
    select: {
      id: true,
      duration_minutes: true,
    },
  });
  // 5. Link them to the new timesheet and calculate total_hours
  let totalMinutes = 0;
  if (eligibleTimelogs.length > 0) {
    const now = new Date();
    await MyGlobal.prisma.erp_hrm_timesheet_timelogs.createMany({
      data: eligibleTimelogs.map((timelog) => ({
        id: v4(),
        erp_hrm_timesheet_id: timesheetId,
        erp_hrm_timelog_id: timelog.id,
        added_at: now,
      })),
    });
    totalMinutes = eligibleTimelogs.reduce(
      (sum, timelog) => sum + timelog.duration_minutes,
      0,
    );
  }
  // 6. Update total_hours (convert minutes to hours)
  const totalHours = totalMinutes / 60;
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: timesheetId },
    data: {
      total_hours: totalHours,
      updated_at: new Date(),
    },
  });
  // 7. Return the created timesheet with full details
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return await ErpHrmTimesheetTransformer.transform(timesheet);
}
