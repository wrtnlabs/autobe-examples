import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDashboard";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import { IErpHrmPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPersonalDashboard";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "../transformers/ErpHrmTaskAtSummaryTransformer";
import { ErpHrmTimelogAtSummaryTransformer } from "../transformers/ErpHrmTimelogAtSummaryTransformer";
import { ErpHrmTimerAtSummaryTransformer } from "../transformers/ErpHrmTimerAtSummaryTransformer";
import { ErpHrmTimesheetAtSummaryTransformer } from "../transformers/ErpHrmTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberDashboard(props: {
  member: MemberPayload;
}): Promise<IErpHrmDashboard> {
  // Get current session with organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        id: true,
        erp_hrm_organization_id: true,
      },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  // Find employee record for this member in the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  // Calculate current week boundaries (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  // Today's date boundaries
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  // Personal Dashboard - Hours Today
  const hoursTodayResult = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    where: {
      employee_id: employee.id,
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
      deleted_at: null,
    },
    _sum: {
      duration: true,
    },
  });
  const hoursToday = (hoursTodayResult._sum.duration ?? 0) / 60;
  // Personal Dashboard - Hours This Week
  const hoursThisWeekResult = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    where: {
      employee_id: employee.id,
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
      deleted_at: null,
    },
    _sum: {
      duration: true,
    },
  });
  const hoursThisWeek = (hoursThisWeekResult._sum.duration ?? 0) / 60;
  // Personal Dashboard - Active Timer
  const activeTimerRecord = await MyGlobal.prisma.erp_hrm_timers.findFirst({
    where: {
      erp_hrm_employee_id: employee.id,
      deleted_at: null,
    },
    ...ErpHrmTimerAtSummaryTransformer.select(),
  });
  const activeTimer = activeTimerRecord
    ? await ErpHrmTimerAtSummaryTransformer.transform(activeTimerRecord)
    : null;
  // Personal Dashboard - Recent Timelogs (5 most recent)
  const recentTimelogsRecords = await MyGlobal.prisma.erp_hrm_timelogs.findMany(
    {
      where: {
        employee_id: employee.id,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 5,
      ...ErpHrmTimelogAtSummaryTransformer.select(),
    },
  );
  const recentTimelogs = await ArrayUtil.asyncMap(
    recentTimelogsRecords,
    ErpHrmTimelogAtSummaryTransformer.transform,
  );
  // Personal Dashboard - Pending Timesheet (draft or submitted for current week)
  const pendingTimesheetRecord =
    await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
      where: {
        employee_id: employee.id,
        week_start_date: weekStart,
        status: {
          in: ["draft", "submitted"],
        },
        deleted_at: null,
      },
      ...ErpHrmTimesheetAtSummaryTransformer.select(),
    });
  const pendingTimesheet = pendingTimesheetRecord
    ? await ErpHrmTimesheetAtSummaryTransformer.transform(
        pendingTimesheetRecord,
      )
    : null;
  // Personal Dashboard - Assigned Tasks (open or in-progress)
  // Priority order: urgent > high > medium > low
  const priorityOrder: Record<string, number> = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  const assignedTasksRecords = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where: {
      employee_id: employee.id,
      status: {
        in: ["open", "in-progress"],
      },
      deleted_at: null,
    },
    ...ErpHrmTaskAtSummaryTransformer.select(),
  });
  const assignedTasks = await ArrayUtil.asyncMap(
    assignedTasksRecords.sort((a, b) => {
      const priorityDiff =
        (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
      if (priorityDiff !== 0) return priorityDiff;
      if (a.due_date === null && b.due_date === null) return 0;
      if (a.due_date === null) return 1;
      if (b.due_date === null) return -1;
      return a.due_date.getTime() - b.due_date.getTime();
    }),
    ErpHrmTaskAtSummaryTransformer.transform,
  );
  // Check if user has report:view permission
  const permissionRecord =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "report:view",
      },
    });
  const hasReportViewPermission = permissionRecord !== null;
  // Organization Dashboard (only if has permission)
  let organization: IErpHrmOrganizationDashboard | null = null;
  if (hasReportViewPermission) {
    // Total Active Employees
    const totalActiveEmployees = await MyGlobal.prisma.erp_hrm_employees.count({
      where: {
        erp_hrm_organization_id: session.erp_hrm_organization_id,
        status: "active",
        deleted_at: null,
      },
    });
    // Weekly Hours for all employees in organization
    const weeklyHoursResult = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
      where: {
        employee: {
          erp_hrm_organization_id: session.erp_hrm_organization_id,
        },
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
        deleted_at: null,
      },
      _sum: {
        duration: true,
      },
    });
    const weeklyHours = (weeklyHoursResult._sum.duration ?? 0) / 60;
    // Pending Approvals (submitted timesheets)
    const pendingApprovals = await MyGlobal.prisma.erp_hrm_timesheets.count({
      where: {
        employee: {
          erp_hrm_organization_id: session.erp_hrm_organization_id,
        },
        status: "submitted",
        deleted_at: null,
      },
    });
    // Budget Alerts - Projects over 80% budget utilization
    const projectsWithBudget = await MyGlobal.prisma.erp_hrm_projects.findMany({
      where: {
        organization_id: session.erp_hrm_organization_id,
        budget_hours: {
          not: null,
        },
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        budget_hours: true,
      },
    });
    const budgetAlerts: IErpHrmOrganizationDashboard.IBudgetAlert[] = [];
    for (const project of projectsWithBudget) {
      if (project.budget_hours === null || project.budget_hours === 0) {
        continue;
      }
      const actualHoursResult =
        await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
          where: {
            project_id: project.id,
            deleted_at: null,
          },
          _sum: {
            duration: true,
          },
        });
      const actualHours = (actualHoursResult._sum.duration ?? 0) / 60;
      const utilizationPercentage =
        Math.round((actualHours / project.budget_hours) * 1000) / 10;
      if (utilizationPercentage >= 80) {
        budgetAlerts.push({
          project_id: project.id,
          project_name: project.name,
          budget_hours: project.budget_hours,
          actual_hours: actualHours,
          utilization_percentage: utilizationPercentage,
        } satisfies IErpHrmOrganizationDashboard.IBudgetAlert);
      }
    }
    // Sort by utilization percentage descending
    budgetAlerts.sort(
      (a, b) => b.utilization_percentage - a.utilization_percentage,
    );
    // Top Performers - Top 5 employees by hours this week
    const topPerformersData = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
      by: ["employee_id"],
      where: {
        employee: {
          erp_hrm_organization_id: session.erp_hrm_organization_id,
        },
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
        deleted_at: null,
      },
      _sum: {
        duration: true,
      },
      orderBy: {
        _sum: {
          duration: "desc",
        },
      },
      take: 5,
    });
    const topPerformers: IErpHrmOrganizationDashboard.ITopPerformer[] = [];
    for (const data of topPerformersData) {
      const employeeRecord =
        await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
          where: { id: data.employee_id },
          ...ErpHrmEmployeeAtSummaryTransformer.select(),
        });
      const hoursLogged = (data._sum.duration ?? 0) / 60;
      topPerformers.push({
        employee:
          await ErpHrmEmployeeAtSummaryTransformer.transform(employeeRecord),
        hours_logged: hoursLogged,
      } satisfies IErpHrmOrganizationDashboard.ITopPerformer);
    }
    organization = {
      total_active_employees: totalActiveEmployees,
      weekly_hours: weeklyHours,
      pending_approvals: pendingApprovals,
      budget_alerts: budgetAlerts,
      top_performers: topPerformers,
    } satisfies IErpHrmOrganizationDashboard;
  }
  // Construct response
  const personal: IErpHrmPersonalDashboard = {
    hoursToday: hoursToday,
    hoursThisWeek: hoursThisWeek,
    activeTimer: activeTimer,
    recentTimelogs: recentTimelogs,
    pendingTimesheet: pendingTimesheet,
    assignedTasks: assignedTasks,
  } satisfies IErpHrmPersonalDashboard;
  return {
    personal,
    organization,
  } satisfies IErpHrmDashboard;
}
