import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimesheet.IUpdate;
}): Promise<IHrmPlatformTimesheet> {
  // Find the timesheet
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        status: true,
        week_start_date: true,
      },
    });
  // Verify ownership - timesheet must belong to the requesting member's employee
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null || timesheet.hrm_platform_employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify status is draft - only draft timesheets can be updated
  if (timesheet.status !== "draft") {
    throw new HttpException("Only draft timesheets can be updated", 400);
  }
  // Build update data
  const updateData: Prisma.hrm_platform_timesheetsUpdateInput = {
    updated_at: new Date(),
  };
  let newWeekStartDate: Date | null = null;
  // Handle week_start_date update
  if (props.body.week_start_date !== undefined) {
    // Validate it's a Monday
    const weekStart = new Date(props.body.week_start_date);
    if (weekStart.getDay() !== 1) {
      throw new HttpException("week_start_date must be a Monday", 400);
    }
    // Check for overlapping submitted/approved timesheets
    const overlappingTimesheet =
      await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
        where: {
          hrm_platform_employee_id: employee.id,
          week_start_date: weekStart,
          status: { in: ["submitted", "approved"] },
          deleted_at: null,
        },
      });
    if (overlappingTimesheet !== null) {
      throw new HttpException(
        "A timesheet for this week already exists with submitted or approved status",
        400,
      );
    }
    updateData.week_start_date = weekStart;
    newWeekStartDate = weekStart;
  }
  // Update the timesheet
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: updateData,
  });
  // Recalculate total_hours if week_start_date changed
  if (newWeekStartDate !== null) {
    const weekEndDate = new Date(newWeekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);
    const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
      where: {
        hrm_platform_employee_id: employee.id,
        date: {
          gte: newWeekStartDate,
          lt: weekEndDate,
        },
        deleted_at: null,
      },
      select: { duration: true },
    });
    const totalMinutes = timelogs.reduce((sum, tl) => sum + tl.duration, 0);
    const totalHours = totalMinutes / 60;
    await MyGlobal.prisma.hrm_platform_timesheets.update({
      where: { id: props.timesheetId },
      data: { total_hours: totalHours, updated_at: new Date() },
    });
  }
  // Fetch the updated timesheet with full details for response
  const finalTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(finalTimesheet);
}
