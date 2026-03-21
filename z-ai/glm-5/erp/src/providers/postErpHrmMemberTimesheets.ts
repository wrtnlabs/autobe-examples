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
import { ErpHrmTimesheetCollector } from "../collectors/ErpHrmTimesheetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimesheet.ICreate;
}): Promise<IErpHrmTimesheet> {
  // Get session with organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("Organization context missing", 400);
  }
  // Find employee record for this member in the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true, status: true },
  });
  if (employee === null) {
    throw new HttpException("Employee not found in organization", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException(
      "Deactivated employees cannot create timesheets",
      403,
    );
  }
  // Parse and validate week_start_date
  const weekStartDate = new Date(props.body.week_start_date);
  const dayOfWeek = weekStartDate.getDay();
  // 0 = Sunday, 1 = Monday
  if (dayOfWeek !== 1) {
    throw new HttpException("week_start_date must be a Monday", 400);
  }
  // Calculate week_end_date (Sunday = Monday + 6 days)
  const weekEndDate = new Date(
    weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000,
  );
  // Check for existing timesheet for same employee and week
  const existingTimesheet = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      employee_id: employee.id,
      week_start_date: weekStartDate,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingTimesheet !== null) {
    throw new HttpException("Timesheet already exists for this week", 409);
  }
  // Find all timelogs for this employee within the week range
  const timelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      employee_id: employee.id,
      date: {
        gte: weekStartDate,
        lte: weekEndDate,
      },
      deleted_at: null,
    },
    select: { id: true, duration: true },
  });
  // Calculate total_hours
  const totalHours = timelogs.reduce((sum, t) => sum + t.duration / 60, 0);
  // Create timesheet using collector pattern
  const timesheetData = await ErpHrmTimesheetCollector.collect({
    body: props.body,
    erpHrmEmployees: { id: employee.id },
  });
  // Create timesheet with calculated total_hours
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.create({
    data: {
      ...timesheetData,
      total_hours: totalHours,
    },
    ...ErpHrmTimesheetTransformer.select(),
  });
  // Create junction records for timelogs
  if (timelogs.length > 0) {
    await MyGlobal.prisma.erp_hrm_timesheet_timelogs.createMany({
      data: timelogs.map((t) => ({
        id: v4(),
        timesheet_id: timesheet.id,
        timelog_id: t.id,
        created_at: new Date(),
      })),
    });
  }
  // Re-fetch to get the timelog associations
  const result = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: timesheet.id },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return await ErpHrmTimesheetTransformer.transform(result);
}
