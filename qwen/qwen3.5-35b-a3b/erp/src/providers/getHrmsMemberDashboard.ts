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

export async function getHrmsMemberDashboard(props: {
  member: MemberPayload;
}): Promise<IHrmsProject> {
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      include: {
        organizationRole: {
          include: {
            permissions: true,
          },
        },
        employees: {
          where: { deleted_at: null },
        },
      },
    });
  const employee = organizationMember?.employees[0];
  if (!organizationMember || !employee) {
    throw new HttpException("Member not found", 404);
  }
  const hasReportPermission =
    organizationMember.organizationRole.permissions.some(
      (p: any) => p.permission === "report:view",
    );
  const weekStart = calculateWeekStart();
  const weekEnd = calculateWeekEnd();
  const today = calculateToday();
  if (!hasReportPermission) {
    const hoursToday = await calculateHoursToday(employee.id, today);
    const hoursThisWeek = await calculateHoursThisWeek(
      employee.id,
      weekStart,
      weekEnd,
    );
    const activeTimer = await findActiveTimer(employee.id);
    const recentTimelogs = await findRecentTimelogs(employee.id, 5);
    const pendingTimesheets = await countPendingTimesheets(
      employee.id,
      weekStart,
      weekEnd,
    );
    const assignedTasks = await findAssignedTasks(employee.id);
    return {
      dashboard_type: "personal",
      generation_timestamp: currentTimestamp(),
      hours_today: hoursToday,
      hours_this_week: hoursThisWeek,
      active_timer: activeTimer,
      recent_timelogs: recentTimelogs,
      pending_timesheets_count: pendingTimesheets,
      assigned_tasks: assignedTasks,
    } satisfies IHrmsProject;
  }
  const activeEmployeeCount = await countActiveEmployees(
    organizationMember.hrms_organization_id,
  );
  const totalHoursThisWeek = await calculateOrganizationHoursThisWeek(
    organizationMember.hrms_organization_id,
    weekStart,
    weekEnd,
  );
  const pendingTimesheetsCount = await countOrganizationPendingTimesheets(
    organizationMember.hrms_organization_id,
    weekStart,
    weekEnd,
  );
  const budgetAlerts = await findBudgetAlerts(
    organizationMember.hrms_organization_id,
  );
  const topEmployees = await findTopEmployees(
    organizationMember.hrms_organization_id,
    weekStart,
    weekEnd,
    5,
  );
  return {
    dashboard_type: "organization",
    generation_timestamp: currentTimestamp(),
    active_employee_count: activeEmployeeCount,
    total_hours_this_week: totalHoursThisWeek,
    pending_timesheets_count: pendingTimesheetsCount,
    budget_alerts: budgetAlerts,
    top_employees: topEmployees,
  } satisfies IHrmsProject;
}
function calculateWeekStart(): string & tags.Format<"date-time"> {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return toISOStringSafe(date);
}
function calculateWeekEnd(): string & tags.Format<"date-time"> {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? 0 : 7);
  date.setDate(diff);
  date.setHours(23, 59, 59, 999);
  return toISOStringSafe(date);
}
function calculateToday(): string & tags.Format<"date-time"> {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return toISOStringSafe(date);
}
function currentTimestamp(): string & tags.Format<"date-time"> {
  return toISOStringSafe(new Date());
}
async function calculateHoursToday(
  employeeId: string,
  today: string & tags.Format<"date-time">,
): Promise<number | null | undefined> {
  const nextDay = addDays(today, 1);
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: employeeId,
      date: {
        gte: today,
        lt: nextDay,
      },
      deleted_at: null,
    },
    select: { duration_minutes: true },
  });
  const totalMinutes = timelogs.reduce(
    (
      sum: number,
      t: {
        duration_minutes: number;
      },
    ) => sum + t.duration_minutes,
    0,
  );
  if (totalMinutes > 0) {
    const hours = Math.round((totalMinutes / 60) * 100) / 100;
    return hours;
  }
  return undefined;
}
async function calculateHoursThisWeek(
  employeeId: string,
  weekStart: string & tags.Format<"date-time">,
  weekEnd: string & tags.Format<"date-time">,
): Promise<number | null | undefined> {
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: employeeId,
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
      deleted_at: null,
    },
    select: { duration_minutes: true },
  });
  const totalMinutes = timelogs.reduce(
    (
      sum: number,
      t: {
        duration_minutes: number;
      },
    ) => sum + t.duration_minutes,
    0,
  );
  if (totalMinutes > 0) {
    const hours = Math.round((totalMinutes / 60) * 100) / 100;
    return hours;
  }
  return undefined;
}
function addDays(
  dateString: string & tags.Format<"date-time">,
  days: number,
): string & tags.Format<"date-time"> {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return toISOStringSafe(date);
}
async function findActiveTimer(
  employeeId: string,
): Promise<IHrmsTimer | null | undefined> {
  const timer = await MyGlobal.prisma.hrms_timers.findFirst({
    where: {
      hrms_employee_id: employeeId,
      deleted_at: null,
    },
    include: {
      employee: {
        select: {
          id: true,
          display_name: true,
          department_id: true,
          position: true,
          status: true,
        },
      },
      project: {
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
      },
      task: {
        select: {
          id: true,
          hrms_project_id: true,
        },
      },
    },
  });
  if (!timer) {
    return undefined;
  }
  return {
    id: timer.id,
    employee: {
      id: timer.employee.id,
      display_name: timer.employee.display_name,
      department_id:
        timer.employee.department_id ??
        ("00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">),
      position: timer.employee.position ?? undefined,
      total_hours_logged: 0,
      timelog_count: 0,
      timesheets_submitted: 0,
      timesheets_approved: 0,
      timesheets_pending: 0,
      status: timer.employee.status,
    } satisfies IHrmsEmployee.ISummary,
    project: {
      id: timer.project.id,
      name: timer.project.name,
      description: timer.project.description ?? "",
      color_code: timer.project.color_code,
      organization_id: timer.project.hrms_organization_id,
      organization_name: "",
      status: "active" as "active" | "archived" | "completed",
      budget_hours: timer.project.budget_hours,
      start_date:
        timer.project.start_date != null
          ? toISOStringSafe(timer.project.start_date)
          : null,
      end_date:
        timer.project.end_date != null
          ? toISOStringSafe(timer.project.end_date)
          : null,
      planned_hours: timer.project.budget_hours ?? 0,
      actual_hours: 0,
      budget_utilization_percentage: null,
      total_tasks: 0,
      pending_tasks: 0,
      in_progress_tasks: 0,
      completed_tasks: 0,
      closed_tasks: 0,
      timelog_count: 0,
      created_at: toISOStringSafe(timer.project.created_at),
      updated_at: toISOStringSafe(timer.project.updated_at),
    } satisfies IHrmsProject.ISummary,
    task: timer.task
      ? ({
          project_id: timer.task.hrms_project_id,
          project_name: "",
          task_count: 0,
        } satisfies IHrmsTask.ISummary)
      : undefined,
    start_at: toISOStringSafe(timer.start_at),
    description: timer.description ?? undefined,
    created_at: toISOStringSafe(timer.created_at),
    updated_at: toISOStringSafe(timer.updated_at),
    deleted_at:
      timer.deleted_at != null ? toISOStringSafe(timer.deleted_at) : null,
  };
}
async function findRecentTimelogs(
  employeeId: string,
  limit: number,
): Promise<IHrmsTimelog.ISummary[] | undefined> {
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: employeeId,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
    take: limit,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          hrms_organization_id: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
  return timelogs.map((t) => ({
    id: t.id,
    project_id: t.project_id,
    project_name: t.project.name,
    task_id: t.task_id ?? undefined,
    task_title: t.task?.title ?? undefined,
    duration_minutes: t.duration_minutes,
    billable: t.billable,
    description: t.description ?? undefined,
    date: toISOStringSafe(t.date),
    created_at: toISOStringSafe(t.created_at),
    group_id: null as any as string & tags.Format<"uuid">,
    group_name: "",
    total_hours: 0,
    billable_hours: 0,
    non_billable_hours: 0,
  }));
}
async function countPendingTimesheets(
  employeeId: string,
  weekStart: string & tags.Format<"date-time">,
  weekEnd: string & tags.Format<"date-time">,
): Promise<(number & tags.Type<"int32">) | null | undefined> {
  const count = await MyGlobal.prisma.hrms_timesheets.count({
    where: {
      hrms_employee_id: employeeId,
      week_start_date: {
        gte: weekStart,
        lte: weekEnd,
      },
      status: "submitted",
      deleted_at: null,
    },
  });
  if (count > 0) {
    return count as number & tags.Type<"int32">;
  }
  return undefined;
}
async function findAssignedTasks(
  employeeId: string,
): Promise<IHrmsTask.ISummary[] | undefined> {
  const tasks = await MyGlobal.prisma.hrms_tasks.findMany({
    where: {
      hrms_employee_id: employeeId,
      status: { in: ["open", "in-progress"] },
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      billable: true,
      hrms_project_id: true,
      project: {
        select: {
          name: true,
        },
      },
    },
  });
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? undefined,
    status: "open" as "open" | "in-progress" | "completed" | "closed",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    estimated_hours: t.estimated_hours,
    due_date: t.due_date != null ? toISOStringSafe(t.due_date) : null,
    billable: t.billable ?? undefined,
    project_id: t.hrms_project_id,
    project_name: t.project?.name ?? "",
    task_count: 0,
  }));
}
async function countActiveEmployees(
  organizationId: string,
): Promise<(number & tags.Type<"int32">) | null | undefined> {
  const count = await MyGlobal.prisma.hrms_employees.count({
    where: {
      organization_member_id: organizationId,
      status: "active",
      deleted_at: null,
    },
  });
  if (count > 0) {
    return count as number & tags.Type<"int32">;
  }
  return undefined;
}
async function calculateOrganizationHoursThisWeek(
  organizationId: string,
  weekStart: string & tags.Format<"date-time">,
  weekEnd: string & tags.Format<"date-time">,
): Promise<number | null | undefined> {
  const employees = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      organization_member_id: organizationId,
      status: "active",
      deleted_at: null,
    },
    select: { id: true },
  });
  const employeeIds = employees.map((e) => e.id);
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: { in: employeeIds },
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
      deleted_at: null,
    },
    select: { duration_minutes: true },
  });
  const totalMinutes = timelogs.reduce(
    (
      sum: number,
      t: {
        duration_minutes: number;
      },
    ) => sum + t.duration_minutes,
    0,
  );
  if (totalMinutes > 0) {
    const hours = Math.round((totalMinutes / 60) * 100) / 100;
    return hours;
  }
  return undefined;
}
async function countOrganizationPendingTimesheets(
  organizationId: string,
  weekStart: string & tags.Format<"date-time">,
  weekEnd: string & tags.Format<"date-time">,
): Promise<(number & tags.Type<"int32">) | null | undefined> {
  const employees = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      organization_member_id: organizationId,
      status: "active",
      deleted_at: null,
    },
    select: { id: true },
  });
  const employeeIds = employees.map((e) => e.id);
  const count = await MyGlobal.prisma.hrms_timesheets.count({
    where: {
      hrms_employee_id: { in: employeeIds },
      week_start_date: {
        gte: weekStart,
        lte: weekEnd,
      },
      status: "submitted",
      deleted_at: null,
    },
  });
  if (count > 0) {
    return count as number & tags.Type<"int32">;
  }
  return undefined;
}
async function findBudgetAlerts(
  organizationId: string,
): Promise<IHrmsProject.ISummary[] | undefined> {
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      hrms_organization_id: organizationId,
      status: "active",
      budget_hours: { gt: 0 },
      deleted_at: null,
    },
    include: {
      timelogs: {
        where: { deleted_at: null },
        select: { duration_minutes: true },
      },
    },
  });
  const alerts: Array<{
    project: (typeof projects)[0];
    actual_hours: number;
    utilization: number;
  }> = [];
  for (const project of projects) {
    const totalMinutes = project.timelogs.reduce(
      (
        sum: number,
        t: {
          duration_minutes: number;
        },
      ) => sum + t.duration_minutes,
      0,
    );
    const actualHours = Math.round((totalMinutes / 60) * 100) / 100;
    const utilization = (actualHours / (project.budget_hours ?? 1)) * 100;
    if (utilization > 80) {
      alerts.push({
        project,
        actual_hours: actualHours,
        utilization: utilization,
      });
    }
  }
  if (alerts.length === 0) {
    return undefined;
  }
  return alerts.map((a) => ({
    id: a.project.id,
    name: a.project.name,
    description: a.project.description ?? "",
    color_code: a.project.color_code,
    organization_id: a.project.hrms_organization_id,
    organization_name: "",
    status: "active" as "active" | "archived" | "completed",
    budget_hours: a.project.budget_hours,
    start_date:
      a.project.start_date != null
        ? toISOStringSafe(a.project.start_date)
        : null,
    end_date:
      a.project.end_date != null ? toISOStringSafe(a.project.end_date) : null,
    planned_hours: a.project.budget_hours ?? 0,
    actual_hours: a.actual_hours,
    budget_utilization_percentage: a.utilization,
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    closed_tasks: 0,
    timelog_count: 0,
    created_at: toISOStringSafe(a.project.created_at),
    updated_at: toISOStringSafe(a.project.updated_at),
  }));
}
async function findTopEmployees(
  organizationId: string,
  weekStart: string & tags.Format<"date-time">,
  weekEnd: string & tags.Format<"date-time">,
  limit: number,
): Promise<IHrmsTopEmployee.ISummary[] | undefined> {
  const employees = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      organization_member_id: organizationId,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
      position: true,
      department_id: true,
    },
  });
  const employeeIds = employees.map((e) => e.id);
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: { in: employeeIds },
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
      deleted_at: null,
    },
    select: {
      employee_id: true,
      duration_minutes: true,
      project_id: true,
      task_id: true,
      billable: true,
    },
  });
  const employeeData = new Map<
    string,
    {
      total: number;
      billable: number;
      projects: Set<string>;
      tasks: Set<string>;
    }
  >();
  for (const timelog of timelogs) {
    const current = employeeData.get(timelog.employee_id) ?? {
      total: 0,
      billable: 0,
      projects: new Set(),
      tasks: new Set(),
    };
    current.total += timelog.duration_minutes;
    if (timelog.billable) {
      current.billable += timelog.duration_minutes;
    }
    if (timelog.project_id) current.projects.add(timelog.project_id);
    if (timelog.task_id) current.tasks.add(timelog.task_id);
    employeeData.set(timelog.employee_id, current);
  }
  const rankings = employees
    .map((employee) => {
      const data = employeeData.get(employee.id) ?? {
        total: 0,
        billable: 0,
        projects: new Set(),
        tasks: new Set(),
      };
      return {
        employee,
        total_hours: data.total,
        billable_hours: data.billable,
        project_count: data.projects.size,
        task_count: data.tasks.size,
      };
    })
    .filter((r) => r.total_hours > 0)
    .sort((a, b) => b.total_hours - a.total_hours)
    .slice(0, limit);
  if (rankings.length === 0) {
    return undefined;
  }
  return rankings.map((r) => ({
    id: r.employee.id,
    display_name: r.employee.display_name,
    position: r.employee.position ?? "",
    department_id: r.employee.department_id ?? null,
    total_hours: r.total_hours,
    billable_hours: r.billable_hours,
    project_count: r.project_count,
    task_count: r.task_count,
  }));
}
