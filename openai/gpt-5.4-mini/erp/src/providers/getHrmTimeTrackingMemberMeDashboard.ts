import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboard";
import { IHrmTimeTrackingDashboardOrganizationMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardOrganizationMetric";
import { IHrmTimeTrackingDashboardPendingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardPendingTimesheet";
import { IHrmTimeTrackingDashboardPeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardPeriod";
import { IHrmTimeTrackingDashboardPersonal } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardPersonal";
import { IHrmTimeTrackingDashboardRecentTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardRecentTimelog";
import { IHrmTimeTrackingDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardSummary";
import { IHrmTimeTrackingDashboardTopProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardTopProject";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimerSession";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IHrmTimeTrackingWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingWeeklySummaryReport";
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

export async function getHrmTimeTrackingMemberMeDashboard(props: {
  member: MemberPayload;
}): Promise<IHrmTimeTrackingDashboard> {
  const member =
    await MyGlobal.prisma.hrm_time_tracking_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: {
        id: true,
        email: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const session =
    await MyGlobal.prisma.hrm_time_tracking_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { id: true, hrm_time_tracking_member_id: true },
    });
  if (session.hrm_time_tracking_member_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: { deleted_at: null, user_account_id: member.id },
    select: {
      id: true,
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
          logo_image_url: true,
          currency: true,
          timezone: true,
          fiscal_start_month: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      role: {
        select: {
          id: true,
          organization: {
            select: {
              id: true,
              name: true,
              description: true,
              logo_image_url: true,
              currency: true,
              timezone: true,
              fiscal_start_month: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          name: true,
          code: true,
          description: true,
          is_builtin: true,
          sort_order: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          description: true,
          parent_department_id: true,
          created_at: true,
          updated_at: true,
        },
      },
      position_title: true,
      employment_type: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const organization = {
    id: employee.organization.id,
    name: employee.organization.name,
    description: employee.organization.description,
    logoImageUrl: employee.organization.logo_image_url,
    currency: employee.organization.currency,
    timezone: employee.organization.timezone,
    fiscalStartMonth: employee.organization.fiscal_start_month,
    createdAt: toISOStringSafe(employee.organization.created_at),
    updatedAt: toISOStringSafe(employee.organization.updated_at),
    deletedAt: employee.organization.deleted_at
      ? toISOStringSafe(employee.organization.deleted_at)
      : null,
  } satisfies IHrmTimeTrackingOrganization.ISummary;
  const employeeSummary = {
    id: employee.id,
    organization,
    userAccount: {
      id: member.id,
      email: member.email,
      is_active: member.is_active,
      last_login_at: member.last_login_at
        ? toISOStringSafe(member.last_login_at)
        : null,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    },
    role: {
      id: employee.role.id,
      organization: {
        id: employee.role.organization.id,
        name: employee.role.organization.name,
        description: employee.role.organization.description,
        logoImageUrl: employee.role.organization.logo_image_url,
        currency: employee.role.organization.currency,
        timezone: employee.role.organization.timezone,
        fiscalStartMonth: employee.role.organization.fiscal_start_month,
        createdAt: toISOStringSafe(employee.role.organization.created_at),
        updatedAt: toISOStringSafe(employee.role.organization.updated_at),
        deletedAt: employee.role.organization.deleted_at
          ? toISOStringSafe(employee.role.organization.deleted_at)
          : null,
      },
      name: employee.role.name,
      code: employee.role.code,
      description: employee.role.description,
      isBuiltin: employee.role.is_builtin,
      sortOrder: employee.role.sort_order,
      createdAt: toISOStringSafe(employee.role.created_at),
      updatedAt: toISOStringSafe(employee.role.updated_at),
      deletedAt: employee.role.deleted_at
        ? toISOStringSafe(employee.role.deleted_at)
        : null,
    },
    department:
      employee.department === null
        ? null
        : {
            id: employee.department.id,
            name: employee.department.name,
            description: employee.department.description,
            parentDepartmentId: employee.department.parent_department_id,
            created_at: toISOStringSafe(employee.department.created_at),
            updated_at: toISOStringSafe(employee.department.updated_at),
          },
    positionTitle: employee.position_title,
    employmentType: employee.employment_type,
    status: employee.status,
    createdAt: toISOStringSafe(employee.created_at),
    updatedAt: toISOStringSafe(employee.updated_at),
    deletedAt: employee.deleted_at
      ? toISOStringSafe(employee.deleted_at)
      : null,
  } satisfies IHrmTimeTrackingEmployee.ISummary;
  const today = toISOStringSafe(new Date()).substring(0, 10);
  const todayTimelogCount =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.count({
      where: {
        deleted_at: null,
        employee_id: employee.id,
        organization_id: organization.id,
        work_date: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`),
        },
      },
    });
  const recentTimelogs =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
      where: {
        deleted_at: null,
        employee_id: employee.id,
        organization_id: organization.id,
      },
      orderBy: { created_at: "desc" },
      take: 5,
      select: {
        id: true,
        work_date: true,
        duration_minutes: true,
        description: true,
        billable: true,
      },
    });
  const currentTimesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        deleted_at: null,
        employee_id: employee.id,
        organization_id: organization.id,
      },
      orderBy: { week_start: "desc" },
      select: {
        id: true,
        week_start: true,
        week_end: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    member: {
      id: member.id,
      email: member.email,
      is_active: member.is_active,
      last_login_at: member.last_login_at
        ? toISOStringSafe(member.last_login_at)
        : null,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    },
    organization,
    employee: employeeSummary,
    period: { start: null, end: null, label: null },
    summary: {
      activeEmployeeCount: false,
      activeProjectCount: false,
      runningTimerSessionCount: false,
      totalTimelogCount: false,
      totalTrackedMinutes: false,
      draftTimesheetCount: false,
      submittedTimesheetCount: false,
      approvedTimesheetCount: false,
      rejectedTimesheetCount: false,
    },
    timerSession: null,
    personal: {
      timerSession: null,
      currentTimesheet:
        currentTimesheet === null
          ? null
          : {
              id: currentTimesheet.id,
              organization,
              employee: employeeSummary,
              reviewedByEmployee: null,
              weekStart: toISOStringSafe(currentTimesheet.week_start),
              weekEnd: toISOStringSafe(currentTimesheet.week_end),
              status: currentTimesheet.status,
              submittedAt: currentTimesheet.submitted_at
                ? toISOStringSafe(currentTimesheet.submitted_at)
                : null,
              reviewedAt: currentTimesheet.reviewed_at
                ? toISOStringSafe(currentTimesheet.reviewed_at)
                : null,
              rejectionReason: null,
              createdAt: toISOStringSafe(currentTimesheet.created_at),
              updatedAt: toISOStringSafe(currentTimesheet.updated_at),
              deletedAt: currentTimesheet.deleted_at
                ? toISOStringSafe(currentTimesheet.deleted_at)
                : null,
            },
      weeklySummary: {
        weekStart: false,
        weekEnd: false,
        totalHours: false,
        timelogCount: false,
        employeeCount: false,
      },
      todayTimelogCount: false,
      recentTimelogs: false,
      activeProjectCount: false,
      activeTaskCount: false,
    },
    topProjects: [],
    pendingTimesheets: [],
    recentTimelogs: recentTimelogs.map((timelog) => ({
      id: false,
      work_date: false,
      duration_minutes: false,
      description: timelog.description === null ? null : false,
      billable: timelog.billable,
      employee: employeeSummary,
      project: organization as unknown as IHrmTimeTrackingProject.ISummary,
      task: null,
    })),
    organizationMetrics: null,
  };
}
