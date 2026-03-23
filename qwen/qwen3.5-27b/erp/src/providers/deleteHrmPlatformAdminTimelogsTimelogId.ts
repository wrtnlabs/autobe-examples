import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformAdminTimelogsTimelogId(props: {
  admin: AdminPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the timelog with employee relation
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: {
        id: props.timelogId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_project_id: true,
        hrm_platform_task_id: true,
        date: true,
        employee: {
          select: {
            id: true,
            organization_id: true,
            member: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    },
  );
  // Step 2: Check if timelog exists in any approved timesheet
  // Find the timesheet that would contain this timelog (by week_start_date)
  const weekStart = new Date(timelog.date);
  const dayOfWeek = weekStart.getDay();
  const monday = new Date(weekStart);
  monday.setDate(weekStart.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const approvedTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        status: "approved",
        deleted_at: null,
        hrm_platform_employee_id: timelog.hrm_platform_employee_id,
        week_start_date: monday,
      },
    });
  if (approvedTimesheet !== null) {
    throw new HttpException(
      "Cannot delete timelog from approved timesheet",
      400,
    );
  }
  // Step 3: Soft delete the timelog
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: {
      id: props.timelogId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
  // Step 4: Update draft timesheets that contained this timelog
  const draftTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        status: "draft",
        deleted_at: null,
        hrm_platform_employee_id: timelog.hrm_platform_employee_id,
        week_start_date: monday,
      },
    });
  if (draftTimesheet !== null) {
    // Recalculate total hours for this timesheet
    const weekEnd = new Date(monday);
    weekEnd.setDate(monday.getDate() + 7);
    const activeTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany(
      {
        where: {
          hrm_platform_employee_id: timelog.hrm_platform_employee_id,
          date: {
            gte: monday,
            lt: weekEnd,
          },
          deleted_at: null,
        },
        select: {
          duration: true,
        },
      },
    );
    const totalMinutes = activeTimelogs.reduce(
      (sum, tl) => sum + tl.duration,
      0,
    );
    const totalHours = totalMinutes / 60;
    await MyGlobal.prisma.hrm_platform_timesheets.update({
      where: {
        id: draftTimesheet.id,
      },
      data: {
        total_hours: totalHours,
      },
    });
  }
  // Step 5: Create activity log entry
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      hrm_platform_organization_id: timelog.employee.organization_id,
      hrm_platform_member_id: null,
      action_type: "timelog_deleted",
      target_entity_type: "timelog",
      target_entity_id: props.timelogId,
      action_description: `Timelog ${props.timelogId} was deleted by admin`,
      ip_address: null,
      user_agent: null,
      created_at: new Date(),
    },
  });
}
