import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTimesheetTransformer } from "../transformers/HrmsTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmsMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmsTimesheet.IUpdate;
}): Promise<IHrmsTimesheet> {
  // Fetch timesheet with full data including employee relation
  const timesheet = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      hrms_employee_id: true,
      reviewed_by: true,
      week_start_date: true,
      week_end_date: true,
      status: true,
      total_hours: true,
      submitted_at: true,
      reviewed_at: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      employee: {
        select: { id: true, status: true },
      },
    },
  });
  // Validate status is draft
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet is not in draft status", 409);
  }
  // Check ownership - compare employee ID (not member ID directly)
  if (timesheet.hrms_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate employee is active
  if (timesheet.employee.status !== "active") {
    throw new HttpException("Employee is deactivated", 400);
  }
  // Build update data
  const updateData: Prisma.hrms_timesheetsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.week_start_date !== undefined) {
    updateData.week_start_date = props.body.week_start_date;
    const startDate = new Date(props.body.week_start_date);
    const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    updateData.week_end_date = endDate;
  }
  // Recalculate total_hours from timelogs using employee_id and date range
  const queryDates = props.body.week_start_date
    ? {
        week_start_date: props.body.week_start_date,
        week_end_date: new Date(
          new Date(props.body.week_start_date).getTime() +
            6 * 24 * 60 * 60 * 1000,
        ),
      }
    : {
        week_start_date: timesheet.week_start_date,
        week_end_date: timesheet.week_end_date,
      };
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: timesheet.hrms_employee_id,
      date: {
        gte: queryDates.week_start_date,
        lte: queryDates.week_end_date,
      },
    },
    select: { duration_minutes: true },
  });
  const totalHours = timelogs.reduce(
    (sum, timelog) => sum + timelog.duration_minutes / 60,
    0,
  );
  updateData.total_hours = totalHours;
  // Update record
  const updated = await MyGlobal.prisma.hrms_timesheets.update({
    where: { id: props.timesheetId },
    data: updateData,
    select: {
      id: true,
      week_start_date: true,
      week_end_date: true,
      status: true,
      total_hours: true,
      submitted_at: true,
      reviewed_at: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      employee: {
        select: {
          id: true,
          display_name: true,
          position: true,
          department_id: true,
          status: true,
          _count: { select: { timelogs: true } },
        },
      },
      reviewer: {
        select: {
          id: true,
          email: true,
          display_name: true,
          avatar_uri: true,
          phone_number: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          _count: { select: { organizationMembers: true } },
        },
      },
    },
  });
  // Transform and return
  return await HrmsTimesheetTransformer.transform(updated);
}
