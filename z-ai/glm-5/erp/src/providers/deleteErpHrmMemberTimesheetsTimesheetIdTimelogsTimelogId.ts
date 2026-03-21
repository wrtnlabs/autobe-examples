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

export async function deleteErpHrmMemberTimesheetsTimesheetIdTimelogsTimelogId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get session to find organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization context selected", 400);
  }
  // Get employee record for this member in the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
      },
    },
    select: {
      id: true,
      status: true,
      erp_hrm_role_id: true,
    },
  });
  // Check if employee is deactivated
  if (employee.status === "deactivated") {
    throw new HttpException(
      "Deactivated employees cannot modify timesheets",
      403,
    );
  }
  // Get timesheet with employee relation to verify organization
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      employee_id: true,
      status: true,
      employee: {
        select: { erp_hrm_organization_id: true },
      },
    },
  });
  // Verify timesheet belongs to same organization
  if (
    timesheet.employee.erp_hrm_organization_id !==
    session.erp_hrm_organization_id
  ) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Get timelog
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    select: { id: true, employee_id: true },
  });
  // Verify timelog belongs to same employee as timesheet
  if (timelog.employee_id !== timesheet.employee_id) {
    throw new HttpException("Timelog does not belong to timesheet owner", 400);
  }
  // Check junction record exists
  const junction = await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findUnique({
    where: {
      timesheet_id_timelog_id: {
        timesheet_id: props.timesheetId,
        timelog_id: props.timelogId,
      },
    },
  });
  if (!junction) {
    throw new HttpException("Timelog not found in timesheet", 404);
  }
  // Check for time:manage permission
  const permissions = await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
    where: {
      erp_hrm_role_id: employee.erp_hrm_role_id,
      permission: "time:manage",
    },
  });
  const hasTimeManagePermission = permissions.length > 0;
  // Check authorization
  const isOwner = timesheet.employee_id === employee.id;
  if (!hasTimeManagePermission) {
    if (!isOwner) {
      throw new HttpException("Forbidden", 403);
    }
    if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
      throw new HttpException(
        "Cannot modify timesheet that is submitted or approved",
        403,
      );
    }
  }
  // Delete the junction record
  await MyGlobal.prisma.erp_hrm_timesheet_timelogs.delete({
    where: {
      timesheet_id_timelog_id: {
        timesheet_id: props.timesheetId,
        timelog_id: props.timelogId,
      },
    },
  });
  // Recalculate total_hours from remaining timelogs
  const remainingTimelogs =
    await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany({
      where: { timesheet_id: props.timesheetId },
      select: {
        timelog: { select: { duration: true } },
      },
    });
  const totalMinutes = remainingTimelogs.reduce(
    (sum, item) => sum + item.timelog.duration,
    0,
  );
  const totalHours = totalMinutes / 60;
  // Update timesheet
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      total_hours: totalHours,
      updated_at: new Date(),
    },
  });
}
