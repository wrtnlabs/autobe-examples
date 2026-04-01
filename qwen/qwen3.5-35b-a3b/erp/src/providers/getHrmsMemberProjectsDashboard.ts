import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
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

export async function getHrmsMemberProjectsDashboard(props: {
  member: MemberPayload;
}): Promise<IHrmsProject> {
  const member = await MyGlobal.prisma.hrms_members.findFirst({
    where: { id: props.member.id, deleted_at: null },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const projectMemberships =
    await MyGlobal.prisma.hrms_project_members.findMany({
      where: {
        employee_id: employee.id,
        status: "active",
        deleted_at: null,
      },
      include: {
        project: true,
      },
      orderBy: { created_at: "desc" },
    });
  const organizationIds = Array.from(
    new Set(
      projectMemberships
        .map((pm) => pm.project)
        .filter((p) => p !== null && p !== undefined)
        .map((p) => p!.hrms_organization_id),
    ),
  );
  const organizations = await MyGlobal.prisma.hrms_organizations.findMany({
    where: {
      id: { in: organizationIds },
    },
  });
  const organizationMap = new Map(
    organizations.map((org) => [org.id, org.name]),
  );
  const projectIds = projectMemberships
    .filter((pm) => pm.project !== null && pm.project !== undefined)
    .map((pm) => pm.project_id);
  const tasks = await MyGlobal.prisma.hrms_tasks.findMany({
    where: {
      hrms_employee_id: employee.id,
      hrms_project_id: { in: projectIds },
      deleted_at: null,
    },
    include: {
      project: true,
    },
  });
  const taskCounts = new Map<
    string,
    {
      total: number;
      open: number;
      inProgress: number;
      completed: number;
      closed: number;
    }
  >();
  tasks.forEach((task) => {
    if (!taskCounts.has(task.hrms_project_id)) {
      taskCounts.set(task.hrms_project_id, {
        total: 0,
        open: 0,
        inProgress: 0,
        completed: 0,
        closed: 0,
      });
    }
    const counts = taskCounts.get(task.hrms_project_id)!;
    counts.total += 1;
    switch (task.status) {
      case "open":
      case "pending":
        counts.open += 1;
        break;
      case "in-progress":
        counts.inProgress += 1;
        break;
      case "completed":
        counts.completed += 1;
        break;
      case "closed":
        counts.closed += 1;
        break;
    }
  });
  const todayStart = toISOStringSafe(new Date(new Date().setHours(0, 0, 0, 0)));
  const todayEnd = toISOStringSafe(
    new Date(new Date().setHours(23, 59, 59, 999)),
  );
  const weekStart = toISOStringSafe(
    new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
  );
  const todayTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: employee.id,
      date: { gte: todayStart, lte: todayEnd },
      deleted_at: null,
    },
  });
  const weekTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: employee.id,
      date: { gte: weekStart },
      deleted_at: null,
    },
  });
  const hoursToday =
    todayTimelogs.reduce((sum, log) => sum + log.duration_minutes, 0) / 60;
  const hoursThisWeek =
    weekTimelogs.reduce((sum, log) => sum + log.duration_minutes, 0) / 60;
  const activeTimer = await MyGlobal.prisma.hrms_timers.findFirst({
    where: {
      employee: { id: employee.id },
      deleted_at: null,
    },
    include: {
      employee: true,
      project: true,
      task: true,
    },
  });
  const pendingTimesheetsCount = await MyGlobal.prisma.hrms_timesheets.count({
    where: {
      employee: { id: employee.id },
      status: "submitted",
    },
  });
  const projectSummaries = await Promise.all(
    projectMemberships.map(async (pm) => {
      const project = pm.project;
      if (!project) return null;
      const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
        where: {
          project_id: project.id,
          deleted_at: null,
        },
      });
      const actualHours =
        timelogs.reduce((sum, log) => sum + log.duration_minutes, 0) / 60;
      const budgetHours = project.budget_hours;
      const budgetUtilizationPercent =
        budgetHours !== null && budgetHours > 0
          ? Number(((actualHours / budgetHours) * 100).toFixed(1))
          : 0;
      const taskCount = taskCounts.get(project.id);
      return {
        id: project.id,
        name: project.name,
        description: project.description ?? "",
        color_code: project.color_code,
        organization_id: project.hrms_organization_id,
        organization_name:
          organizationMap.get(project.hrms_organization_id) ?? "",
        status: project.status as "active" | "completed" | "archived",
        budget_hours: project.budget_hours,
        start_date: project.start_date
          ? toISOStringSafe(project.start_date)
          : null,
        end_date: project.end_date ? toISOStringSafe(project.end_date) : null,
        planned_hours: project.budget_hours ?? 0,
        actual_hours: actualHours,
        budget_utilization_percentage: budgetUtilizationPercent,
        total_tasks: taskCount?.total ?? 0,
        pending_tasks: (taskCount?.open ?? 0) + (taskCount?.inProgress ?? 0),
        in_progress_tasks: taskCount?.inProgress ?? 0,
        completed_tasks: taskCount?.completed ?? 0,
        closed_tasks: taskCount?.closed ?? 0,
        timelog_count: timelogs.length,
        created_at: toISOStringSafe(project.created_at),
        updated_at: toISOStringSafe(project.updated_at),
      } satisfies IHrmsProject.ISummary;
    }),
  ).then((summaries) =>
    summaries.filter((p): p is IHrmsProject.ISummary => p !== null),
  );
  const recentTimelogs = todayTimelogs.slice(0, 5).map((log) => ({
    group_id: log.employee_id,
    group_name: employee.display_name,
    total_hours: log.duration_minutes / 60,
    billable_hours: log.billable ? log.duration_minutes / 60 : 0,
    non_billable_hours: !log.billable ? log.duration_minutes / 60 : 0,
  })) satisfies IHrmsTimelog.ISummary[];
  const assignedTasks = Array.from(
    new Set(tasks.map((t) => t.hrms_project_id)),
  ).map((projectId) => {
    const project = projectMemberships.find(
      (pm) => pm.project_id === projectId,
    )?.project;
    return {
      project_id: projectId,
      project_name: project?.name ?? "",
      task_count: taskCounts.get(projectId)?.total ?? 0,
    } satisfies IHrmsTask.ISummary;
  });
  const budgetAlerts: IHrmsProject.ISummary[] = projectSummaries.filter(
    (p): p is IHrmsProject.ISummary => p !== null,
  );
  const topEmployees: IHrmsTopEmployee.ISummary[] = [];
  return {
    dashboard_type: "personal",
    generation_timestamp: toISOStringSafe(new Date()),
    hours_today: hoursToday,
    hours_this_week: hoursThisWeek,
    active_timer: activeTimer?.project
      ? {
          id: activeTimer.id,
          start_at: toISOStringSafe(activeTimer.start_at),
          description: activeTimer.description ?? undefined,
          created_at: toISOStringSafe(activeTimer.created_at),
          updated_at: toISOStringSafe(activeTimer.updated_at),
          deleted_at: null,
          employee: {
            id: activeTimer.employee.id,
            display_name: activeTimer.employee.display_name,
            position: activeTimer.employee.position ?? undefined,
            department_id: activeTimer.employee.department_id!,
            status: activeTimer.employee.status,
            total_hours_logged: 0,
            timelog_count: 0,
            timesheets_submitted: 0,
            timesheets_approved: 0,
            timesheets_pending: 0,
          } satisfies IHrmsEmployee.ISummary,
          project: {
            id: activeTimer.project.id,
            organization_id: activeTimer.project.hrms_organization_id,
            name: activeTimer.project.name,
            description: activeTimer.project.description ?? "",
            color_code: activeTimer.project.color_code,
            status: activeTimer.project.status as
              | "active"
              | "completed"
              | "archived",
            budget_hours: activeTimer.project.budget_hours,
            start_date: activeTimer.project.start_date
              ? toISOStringSafe(activeTimer.project.start_date)
              : null,
            end_date: activeTimer.project.end_date
              ? toISOStringSafe(activeTimer.project.end_date)
              : null,
            organization_name:
              organizationMap.get(activeTimer.project.hrms_organization_id) ??
              "",
            planned_hours: activeTimer.project.budget_hours ?? 0,
            actual_hours: 0,
            budget_utilization_percentage: 0,
            total_tasks: 0,
            pending_tasks: 0,
            in_progress_tasks: 0,
            completed_tasks: 0,
            closed_tasks: 0,
            timelog_count: 0,
            created_at: toISOStringSafe(activeTimer.project.created_at),
            updated_at: toISOStringSafe(activeTimer.project.updated_at),
          } satisfies IHrmsProject.ISummary,
          task: activeTimer.task
            ? {
                id: activeTimer.task.id,
                project_id: activeTimer.task.hrms_project_id,
                title: activeTimer.task.title,
                description: activeTimer.task.description ?? undefined,
                status: activeTimer.task.status as
                  | "open"
                  | "pending"
                  | "in-progress"
                  | "completed"
                  | "closed",
                priority: activeTimer.task.priority as
                  | "low"
                  | "medium"
                  | "high",
                due_date: activeTimer.task.due_date
                  ? toISOStringSafe(activeTimer.task.due_date)
                  : null,
                created_at: toISOStringSafe(activeTimer.task.created_at),
                updated_at: toISOStringSafe(activeTimer.task.updated_at),
                deleted_at: activeTimer.task.deleted_at
                  ? toISOStringSafe(activeTimer.task.deleted_at)
                  : null,
              }
            : null,
        }
      : null,
    recent_timelogs: recentTimelogs,
    pending_timesheets_count: pendingTimesheetsCount,
    assigned_tasks: assignedTasks,
    active_employee_count: null,
    total_hours_this_week: hoursThisWeek,
    budget_alerts: budgetAlerts,
    top_employees: topEmployees,
  } satisfies IHrmsProject;
}
