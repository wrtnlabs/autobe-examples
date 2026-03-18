import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
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

export async function getHrmsMemberDashboardOrganization(props: {
  member: MemberPayload;
}): Promise<IHrmsOrganization> {
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: {
      hrms_member_id: props.member.id,
      id: props.member.session_id,
      expired_at: { gt: new Date() },
    },
  });
  if (session === null) {
    throw new HttpException("Session not found", 404);
  }
  const organizationId: string & tags.Format<"uuid"> =
    session.current_organization_id ?? "";
  const orgMember = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: organizationId,
      deleted_at: null,
    },
  });
  if (orgMember === null) {
    throw new HttpException("Organization member not found", 404);
  }
  const activeEmployeesCount: number & tags.Type<"int32"> =
    await MyGlobal.prisma.hrms_employees.count({
      where: {
        organizationMember: {
          hrms_organization_id: organizationId,
          deleted_at: null,
        },
        status: "active",
        deleted_at: null,
      },
    });
  const now = new Date();
  const currentDayOfWeek: number = now.getUTCDay();
  const mondayOffset: number =
    currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const weekStart: Date = new Date(now.getTime() + mondayOffset * 86400000);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd: Date = new Date(weekStart.getTime() + 6 * 86400000);
  weekEnd.setUTCHours(23, 59, 59, 999);
  const weeklyTimelogsSum = await MyGlobal.prisma.hrms_timelogs.aggregate({
    _sum: {
      duration_minutes: true,
    },
    where: {
      employee: {
        organizationMember: {
          hrms_organization_id: organizationId,
          deleted_at: null,
        },
        status: "active",
        deleted_at: null,
      },
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
      deleted_at: null,
    },
  });
  const totalHoursThisWeek: number =
    weeklyTimelogsSum._sum !== undefined &&
    weeklyTimelogsSum._sum.duration_minutes !== undefined &&
    weeklyTimelogsSum._sum.duration_minutes !== null
      ? Math.round((weeklyTimelogsSum._sum.duration_minutes / 60) * 100) / 100
      : 0;
  const pendingTimesheetsCount: number & tags.Type<"int32"> =
    await MyGlobal.prisma.hrms_timesheets.count({
      where: {
        employee: {
          organizationMember: {
            hrms_organization_id: organizationId,
            deleted_at: null,
          },
          status: "active",
          deleted_at: null,
        },
        status: "submitted",
        deleted_at: null,
      },
    });
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      hrms_organization_id: organizationId,
      status: { in: ["active", "archived"] },
      budget_hours: { gt: 0 },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      color_code: true,
      budget_hours: true,
      status: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
    },
  });
  const projectsOverBudget: IHrmsProject.ISummary[] = [];
  for (const project of projects) {
    const projectWeeklyTimelogsSum =
      await MyGlobal.prisma.hrms_timelogs.aggregate({
        _sum: {
          duration_minutes: true,
        },
        where: {
          project_id: project.id,
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
          deleted_at: null,
        },
      });
    const loggedHours: number =
      projectWeeklyTimelogsSum._sum !== undefined &&
      projectWeeklyTimelogsSum._sum.duration_minutes !== undefined &&
      projectWeeklyTimelogsSum._sum.duration_minutes !== null
        ? projectWeeklyTimelogsSum._sum.duration_minutes / 60
        : 0;
    const budgetHours: number = project.budget_hours ?? 0;
    const utilizationPercentage: number | null =
      budgetHours > 0 ? (loggedHours / budgetHours) * 100 : null;
    if (utilizationPercentage !== null && utilizationPercentage > 80) {
      projectsOverBudget.push({
        id: project.id as string & tags.Format<"uuid">,
        name: project.name,
        description: project.description ?? "",
        color_code: project.color_code,
        organization_id: organizationId,
        organization_name: "",
        status: project.status as "active" | "completed" | "archived",
        budget_hours: project.budget_hours,
        start_date: project.start_date
          ? toISOStringSafe(project.start_date)
          : null,
        end_date: project.end_date ? toISOStringSafe(project.end_date) : null,
        planned_hours: budgetHours,
        actual_hours: loggedHours,
        budget_utilization_percentage: utilizationPercentage,
        total_tasks: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        completed_tasks: 0,
        closed_tasks: 0,
        timelog_count: 0,
        created_at: toISOStringSafe(project.created_at),
        updated_at: toISOStringSafe(project.updated_at),
      } satisfies IHrmsProject.ISummary);
    }
  }
  const topEmployeeTimelogs = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["employee_id"],
    where: {
      employee: {
        organizationMember: {
          hrms_organization_id: organizationId,
          deleted_at: null,
        },
        status: "active",
        deleted_at: null,
      },
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
      deleted_at: null,
    },
    _sum: {
      duration_minutes: true,
    },
    orderBy: {
      _sum: {
        duration_minutes: "desc",
      },
    },
    take: 5,
  });
  const topEmployees: IHrmsEmployee.ISummary[] = [];
  for (const empTimelog of topEmployeeTimelogs) {
    const employee = await MyGlobal.prisma.hrms_employees.findUnique({
      where: {
        id: empTimelog.employee_id,
      },
      select: {
        id: true,
        display_name: true,
        position: true,
        department_id: true,
        status: true,
      },
    });
    if (employee !== null) {
      const hours: number =
        empTimelog._sum !== undefined &&
        empTimelog._sum.duration_minutes !== undefined &&
        empTimelog._sum.duration_minutes !== null
          ? Math.round((empTimelog._sum.duration_minutes / 60) * 100) / 100
          : 0;
      topEmployees.push({
        id: employee.id as string & tags.Format<"uuid">,
        display_name: employee.display_name,
        position: employee.position ?? "",
        department_id: employee.department_id as string & tags.Format<"uuid">,
        total_hours_logged: empTimelog._sum?.duration_minutes ?? 0,
        timelog_count: 0,
        timesheets_submitted: 0,
        timesheets_approved: 0,
        timesheets_pending: 0,
        status: employee.status,
      } satisfies IHrmsEmployee.ISummary);
    }
  }
  return {
    totalActiveEmployees: activeEmployeesCount,
    totalHoursThisWeek: totalHoursThisWeek,
    pendingTimesheetsCount: pendingTimesheetsCount,
    projectsOverBudget: projectsOverBudget,
    topEmployees: topEmployees,
    generatedAt: toISOStringSafe(now),
  } satisfies IHrmsOrganization;
}
