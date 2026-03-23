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

export async function deleteHrmPlatformMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: { id: props.timelogId },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_project_id: true,
        hrm_platform_task_id: true,
        date: true,
        deleted_at: true,
      },
    },
  );
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog already deleted", 400);
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      role_id: true,
      organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 403);
  }
  const hasTimeManagePermission =
    (await MyGlobal.prisma.hrm_platform_role_permissions.count({
      where: {
        hrm_platform_role_id: employee.role_id,
        permission_code: "time:manage",
        deleted_at: null,
      },
    })) > 0;
  if (
    timelog.hrm_platform_employee_id !== employee.id &&
    !hasTimeManagePermission
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const timesheetsWithTimelog =
    await MyGlobal.prisma.hrm_platform_timesheets.findMany({
      where: {
        hrm_platform_employee_id: timelog.hrm_platform_employee_id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        week_start_date: true,
      },
    });
  const timelogDate = new Date(timelog.date);
  const relevantTimesheets = timesheetsWithTimelog.filter((ts) => {
    const weekStart = new Date(ts.week_start_date);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return timelogDate >= weekStart && timelogDate < weekEnd;
  });
  const inApprovedTimesheet = relevantTimesheets.some(
    (ts) => ts.status === "approved",
  );
  if (inApprovedTimesheet) {
    throw new HttpException(
      "Cannot delete timelog that is part of an approved timesheet",
      400,
    );
  }
  const inSubmittedTimesheet = relevantTimesheets.some(
    (ts) => ts.status === "submitted",
  );
  if (inSubmittedTimesheet && !hasTimeManagePermission) {
    throw new HttpException(
      "Cannot delete timelog that is part of a submitted timesheet",
      400,
    );
  }
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  const draftTimesheets = relevantTimesheets.filter(
    (ts) => ts.status === "draft",
  );
  for (const timesheet of draftTimesheets) {
    const weekStart = new Date(timesheet.week_start_date);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const remainingTimelogs =
      await MyGlobal.prisma.hrm_platform_timelogs.findMany({
        where: {
          hrm_platform_employee_id: timelog.hrm_platform_employee_id,
          deleted_at: null,
          date: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
        select: {
          duration: true,
        },
      });
    const newTotalHours =
      remainingTimelogs.reduce((sum, tl) => sum + tl.duration, 0) / 60;
    await MyGlobal.prisma.hrm_platform_timesheets.update({
      where: { id: timesheet.id },
      data: {
        total_hours: newTotalHours,
        updated_at: new Date(),
      },
    });
  }
  const activityLogId = v4();
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: activityLogId,
      hrm_platform_organization_id: employee.organization_id,
      hrm_platform_member_id: props.member.id,
      action_type: "timelog_deleted",
      target_entity_type: "timelog",
      target_entity_id: props.timelogId,
      action_description: `Timelog ${props.timelogId} deleted by member ${props.member.id}`,
      created_at: new Date(),
    },
  });
}
