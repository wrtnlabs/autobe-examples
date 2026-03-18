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
  const { prisma } = MyGlobal;
  const stopTimestamp = toISOStringSafe(new Date());
  const { id: memberId, session_id: sessionId } = props.member;
  const employee = await prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: memberId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  const employeeId = employee.id;
  const activeTimers = await prisma.hrms_timers.findMany({
    where: {
      hrms_employee_id: employeeId,
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
  const stopTime = Date.parse(stopTimestamp);
  const startTime = Date.parse(timer.start_at.toISOString());
  const durationMinutes = Math.round((stopTime - startTime) / 60000);
  const currentDateTime: string & tags.Format<"date-time"> =
    stopTimestamp as string & tags.Format<"date-time">;
  const dateString = stopTimestamp.split("T")[0];
  const dateForTimelog: string & tags.Format<"date-time"> = (dateString +
    "T00:00:00.000Z") as string & tags.Format<"date-time">;
  const timelog = await prisma.hrms_timelogs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      employee_id: employeeId,
      project_id: timer.hrms_project_id,
      task_id: timer.hrms_task_id,
      billable: true,
      created_at: new Date(),
      date: new Date(dateString),
      description: timer.description,
      duration_minutes: durationMinutes,
      updated_at: new Date(),
    },
    select: {
      id: true,
      employee_id: true,
      project_id: true,
      task_id: true,
      billable: true,
      created_at: true,
      date: true,
      description: true,
      duration_minutes: true,
      updated_at: true,
    },
  });
  await prisma.hrms_timers.update({
    where: { id: timer.id },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  const weekStart = new Date(
    new Date().setDate(new Date().getDate() - new Date().getDay() + 1),
  );
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const weekRange: IWeekRange = {
    start_date: toISOStringSafe(weekStart).split("T")[0] as string &
      tags.Format<"date">,
    end_date: toISOStringSafe(weekEnd).split("T")[0] as string &
      tags.Format<"date">,
  };
  const project = await prisma.hrms_projects.findUnique({
    where: { id: timer.hrms_project_id },
    select: {
      id: true,
      name: true,
      description: true,
      color_code: true,
      hrms_organization_id: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
    },
  });
  const organization = await prisma.hrms_organizations.findUnique({
    where: { id: project?.hrms_organization_id },
    select: { name: true },
  });
  const projectSummary: IHrmsProject.ISummary = {
    id: project?.id as string & tags.Format<"uuid">,
    name: project?.name ?? "",
    description: project?.description ?? "",
    color_code: project?.color_code ?? "",
    organization_id: project?.hrms_organization_id as string &
      tags.Format<"uuid">,
    organization_name: organization?.name ?? "",
    status: project?.status as "active" | "archived" | "completed",
    budget_hours: project?.budget_hours ?? null,
    start_date: project?.start_date
      ? toISOStringSafe(project.start_date)
      : toISOStringSafe(new Date("9999-12-31T23:59:59.999Z")),
    end_date: project?.end_date
      ? toISOStringSafe(project.end_date)
      : toISOStringSafe(new Date("9999-12-31T23:59:59.999Z")),
    planned_hours: project?.budget_hours ?? 0,
    actual_hours: 0,
    budget_utilization_percentage: null,
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    closed_tasks: 0,
    timelog_count: 0,
    created_at: project?.created_at
      ? toISOStringSafe(project.created_at)
      : toISOStringSafe(new Date("9999-12-31T23:59:59.999Z")),
    updated_at: project?.updated_at
      ? toISOStringSafe(project.updated_at)
      : toISOStringSafe(new Date("9999-12-31T23:59:59.999Z")),
  };
  const projectsWithHighUtilization: IHrmsProject.ISummary[] = [];
  return {
    id: timelog.id as string & tags.Format<"uuid">,
    employee_id: timelog.employee_id as string & tags.Format<"uuid">,
    project_id: timelog.project_id as string & tags.Format<"uuid">,
    task_id: timelog.task_id
      ? (timelog.task_id as string & tags.Format<"uuid">)
      : null,
    billable: timelog.billable,
    created_at: timelog.created_at
      ? toISOStringSafe(timelog.created_at)
      : toISOStringSafe(new Date()),
    date: toISOStringSafe(timelog.date).split("T")[0] as string &
      tags.Format<"date">,
    description: timelog.description,
    duration_minutes: timelog.duration_minutes,
    updated_at: timelog.updated_at
      ? toISOStringSafe(timelog.updated_at)
      : toISOStringSafe(new Date()),
    active_employees_count: 1,
    current_week_hours: 0,
    pending_timesheets_count: 0,
    projects_with_high_utilization: [],
    total_hours_worked: 0,
    hours_this_month: 0,
    hours_last_month: 0,
    current_week: weekRange,
    generated_at: stopTimestamp,
  } as IHrmsTimelog;
}
