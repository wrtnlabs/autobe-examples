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

export async function deleteHrmPlatformMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
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
  // Verify the member has access to this timesheet
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check authorization: member must own the timesheet
  if (timesheet.hrm_platform_employee_id !== memberEmployee.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check status is draft
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Cannot delete timesheet that is not in draft status",
      409,
    );
  }
  // Calculate week end date (Sunday)
  const weekEndDate = new Date(timesheet.week_start_date);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  // Delete associated timelogs for this week
  await MyGlobal.prisma.hrm_platform_timelogs.deleteMany({
    where: {
      hrm_platform_employee_id: memberEmployee.id,
      date: {
        gte: timesheet.week_start_date,
        lte: weekEndDate,
      },
      deleted_at: null,
    },
  });
  // Delete the timesheet
  await MyGlobal.prisma.hrm_platform_timesheets.delete({
    where: { id: props.timesheetId },
  });
  // Create activity log entry
  const activityLogId = v4();
  const now = new Date();
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: activityLogId,
      hrm_platform_organization_id: memberEmployee.organization_id,
      hrm_platform_member_id: props.member.id,
      action_type: "timesheet_deleted",
      target_entity_type: "timesheet",
      target_entity_id: props.timesheetId,
      action_description: `Timesheet ${props.timesheetId} deleted by member ${props.member.id}`,
      created_at: now,
    },
  });
}
