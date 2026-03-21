import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmMemberTimesheetsTimesheetIdTimelogsTimesheetTimelogId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  timesheetTimelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the timesheet-timelog junction record
  const timesheetTimelog =
    await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findUniqueOrThrow({
      where: { id: props.timesheetTimelogId },
      select: {
        id: true,
        erp_hrm_timesheet_id: true,
        erp_hrm_timelog_id: true,
      },
    });
  // 2. Verify junction belongs to the specified timesheet
  if (timesheetTimelog.erp_hrm_timesheet_id !== props.timesheetId) {
    throw new HttpException("Timesheet timelog not found", 404);
  }
  // 3. Load timesheet with employee_id for authorization
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      status: true,
      total_hours: true,
    },
  });
  // 4. Load employee with role for permission check
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: timesheet.erp_hrm_employee_id },
    select: {
      id: true,
      erp_hrm_member_id: true,
      erp_hrm_role_id: true,
    },
  });
  // 5. Load role permissions
  const rolePermissions =
    await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
      where: { erp_hrm_role_id: employee.erp_hrm_role_id },
      select: { permission: true },
    });
  // 6. Check time:manage permission
  const hasTimeManagePermission = rolePermissions.some(
    (p) => p.permission === "time:manage",
  );
  // 7. Authorization: time:manage permission OR caller is the timesheet owner
  if (
    !hasTimeManagePermission &&
    employee.erp_hrm_member_id !== props.member.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // 8. Check timesheet status: draft OR time:manage permission bypasses
  if (timesheet.status !== "draft" && !hasTimeManagePermission) {
    throw new HttpException(
      "Cannot remove timelogs from submitted or approved timesheets",
      400,
    );
  }
  // 9. Delete the timesheet-timelog junction record
  await MyGlobal.prisma.erp_hrm_timesheet_timelogs.delete({
    where: { id: props.timesheetTimelogId },
  });
  // 10. Recalculate total_hours from remaining timelogs
  const remainingTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      timelogTimesheets: {
        some: {
          erp_hrm_timesheet_id: props.timesheetId,
        },
      },
    },
    select: {
      duration_minutes: true,
    },
  });
  const totalMinutes = remainingTimelogs.reduce(
    (sum, timelog) => sum + timelog.duration_minutes,
    0,
  );
  const totalHours = totalMinutes / 60;
  // 11. Update timesheet total_hours
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      total_hours: totalHours,
      updated_at: new Date(),
    },
  });
}
