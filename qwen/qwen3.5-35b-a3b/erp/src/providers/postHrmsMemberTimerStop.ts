import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
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

export async function postHrmsMemberTimerStop(props: {
  member: MemberPayload;
}): Promise<IHrmsTimelog> {
  // Validate member has associated employee
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  // Query active timer for this employee (exactly one allowed)
  const activeTimers = await MyGlobal.prisma.hrms_timers.findMany({
    where: {
      hrms_employee_id: employee.id,
      deleted_at: null,
    },
  });
  if (activeTimers.length === 0) {
    throw new HttpException("No active timer found", 404);
  }
  if (activeTimers.length > 1) {
    throw new HttpException("Multiple active timers found", 409);
  }
  const timer = activeTimers[0];
  // Calculate duration in minutes, rounded to nearest minute
  const now = new Date();
  const startAt = new Date(timer.start_at);
  const durationMs = now.getTime() - startAt.getTime();
  const duration_minutes = Math.round(durationMs / 60000);
  // Create timelog entry
  const timelog = await MyGlobal.prisma.hrms_timelogs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      employee_id: employee.id,
      project_id: timer.hrms_project_id,
      task_id: timer.hrms_task_id,
      billable: true,
      date: now,
      duration_minutes,
      description: timer.description ?? undefined,
      created_at: now,
      updated_at: now,
    },
  });
  // Soft delete the timer
  await MyGlobal.prisma.hrms_timers.update({
    where: {
      id: timer.id,
    },
    data: {
      deleted_at: now,
    },
  });
  // Calculate current week (Monday-Sunday) from Asia/Seoul timezone
  const utcOffset = 9 * 60 * 60 * 1000; // KST offset
  const kstDate = new Date(now.getTime() + utcOffset);
  const dayOfWeek = kstDate.getDay(); // 0 = Sunday, 1 = Monday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(kstDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const current_week: IWeekRange = {
    start_date: monday.toISOString().split("T")[0],
    end_date: sunday.toISOString().split("T")[0],
  };
  // Calculate current week hours from all timelogs in current week
  const filteredTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      date: {
        gte: monday,
        lte: sunday,
      },
      deleted_at: null,
    },
  });
  const current_week_hours =
    filteredTimelogs.reduce((sum: number, t) => sum + t.duration_minutes, 0) /
    60;
  // Return aggregated metrics (IHrmsTimelog is aggregated metrics, not single timelog)
  return {
    active_employees_count: 0,
    current_week_hours,
    pending_timesheets_count: 0,
    projects_with_high_utilization: [],
    current_week,
    generated_at: toISOStringSafe(kstDate),
  } satisfies IHrmsTimelog;
}
