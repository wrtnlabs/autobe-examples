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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformAdminTimesheetsTimesheetId(props: {
  admin: AdminPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimesheet.IUpdate;
}): Promise<IHrmPlatformTimesheet> {
  // Find the timesheet
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        week_start_date: true,
        status: true,
        deleted_at: true,
      },
    });
  // Verify timesheet is in draft status
  if (timesheet.status !== "draft") {
    throw new HttpException("Only draft timesheets can be updated", 400);
  }
  // Check if week_start_date is being updated
  if (props.body.week_start_date === undefined) {
    // No changes, return current timesheet
    const current =
      await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
        where: { id: props.timesheetId },
        ...HrmPlatformTimesheetTransformer.select(),
      });
    return await HrmPlatformTimesheetTransformer.transform(current);
  }
  // Parse the new week_start_date (input is already ISO string)
  const newWeekStartDate = new Date(props.body.week_start_date);
  // Validate week_start_date is a Monday
  if (newWeekStartDate.getDay() !== 1) {
    throw new HttpException("week_start_date must be a Monday", 400);
  }
  // Calculate week boundaries for overlap check
  const weekStart = new Date(newWeekStartDate);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(0, 0, 0, 0);
  // Check for overlapping submitted/approved timesheets
  const overlapping = await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
    where: {
      hrm_platform_employee_id: timesheet.hrm_platform_employee_id,
      week_start_date: {
        gte: weekStart,
        lt: weekEnd,
      },
      status: { in: ["submitted", "approved"] },
      deleted_at: null,
      id: { not: props.timesheetId },
    },
  });
  if (overlapping) {
    throw new HttpException(
      "A timesheet for this week already exists with status submitted or approved",
      400,
    );
  }
  // Calculate total hours for the new week from timelogs
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      hrm_platform_employee_id: timesheet.hrm_platform_employee_id,
      date: {
        gte: weekStart,
        lt: weekEnd,
      },
      deleted_at: null,
    },
    select: {
      duration: true,
    },
  });
  const totalMinutes = timelogs.reduce((sum, tl) => sum + tl.duration, 0);
  const totalHours = totalMinutes / 60;
  // Update the timesheet
  const updated = await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      week_start_date: newWeekStartDate,
      total_hours: totalHours,
      updated_at: new Date(),
    },
    ...HrmPlatformTimesheetTransformer.select(),
  });
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
