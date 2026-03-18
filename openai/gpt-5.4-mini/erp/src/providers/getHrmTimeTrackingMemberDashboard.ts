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

export async function getHrmTimeTrackingMemberDashboard(props: {
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
  if (!member.is_active || member.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      user_account_id: member.id,
      deleted_at: null,
      status: "active",
    },
    select: {
      id: true,
      organization_id: true,
      position_title: true,
      employment_type: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
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
    },
  });
  if (employee === null) throw new HttpException("Not Found", 404);
  if (employee.organization.id !== employee.organization_id)
    throw new HttpException("Forbidden", 403);
  if (employee.role.organization.id !== employee.organization.id)
    throw new HttpException("Forbidden", 403);
  const roleCode = employee.role.code ?? "";
  if (
    roleCode !== "owner" &&
    roleCode !== "manager" &&
    roleCode !== "employee"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const [
    employeeCount,
    projectCount,
    runningTimerCount,
    timelogCount,
    timelogAggregate,
    draftTimesheetCount,
    submittedTimesheetCount,
    approvedTimesheetCount,
    rejectedTimesheetCount,
    topProjects,
    recentTimelogs,
    currentTimesheet,
  ] = await Promise.all([
    MyGlobal.prisma.hrm_time_tracking_employees.count({
      where: {
        organization_id: employee.organization.id,
        deleted_at: null,
        status: "active",
      },
    }),
    MyGlobal.prisma.hrm_time_tracking_projects.count({
      where: { organization_id: employee.organization.id, deleted_at: null },
    }),
    MyGlobal.prisma.hrm_time_tracking_member_sessions.count({
      where: { hrm_time_tracking_member_id: member.id },
    }),
    MyGlobal.prisma.hrm_time_tracking_timelogs.count({
      where: { organization_id: employee.organization.id, deleted_at: null },
    }),
    MyGlobal.prisma.hrm_time_tracking_timelogs.aggregate({
      where: { organization_id: employee.organization.id, deleted_at: null },
      _sum: { duration_minutes: true },
    }),
    MyGlobal.prisma.hrm_time_tracking_timesheets.count({
      where: {
        organization_id: employee.organization.id,
        deleted_at: null,
        status: "draft",
      },
    }),
    MyGlobal.prisma.hrm_time_tracking_timesheets.count({
      where: {
        organization_id: employee.organization.id,
        deleted_at: null,
        status: "submitted",
      },
    }),
    MyGlobal.prisma.hrm_time_tracking_timesheets.count({
      where: {
        organization_id: employee.organization.id,
        deleted_at: null,
        status: "approved",
      },
    }),
    MyGlobal.prisma.hrm_time_tracking_timesheets.count({
      where: {
        organization_id: employee.organization.id,
        deleted_at: null,
        status: "rejected",
      },
    }),
    MyGlobal.prisma.hrm_time_tracking_projects.findMany({
      where: { organization_id: employee.organization.id, deleted_at: null },
      orderBy: [{ updated_at: "desc" }],
      take: 5,
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
        description: true,
        color_code: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
      where: { organization_id: employee.organization.id, deleted_at: null },
      orderBy: [{ created_at: "desc" }],
      take: 10,
      select: {
        id: true,
        work_date: true,
        duration_minutes: true,
        description: true,
        billable: true,
        employee: {
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
            userAccount: { select: {} },
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
        },
        project: {
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
            description: true,
            color_code: true,
            status: true,
            budget_hours: true,
            start_date: true,
            end_date: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        task: {
          select: {
            id: true,
            project: {
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
                description: true,
                color_code: true,
                status: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            assignee: false,
            parent: false,
            title: true,
            description: true,
            status: true,
            priority: true,
            estimated_hours: true,
            due_date: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        organization_id: employee.organization.id,
        employee_id: employee.id,
        deleted_at: null,
      },
      orderBy: [{ week_start: "desc" }],
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
        employee: {
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
            userAccount: { select: {} },
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
        },
        reviewedByEmployee: false,
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
    }),
  ]);
  return {
    member: {
      id: member.id,
      email: member.email,
      is_active: member.is_active,
      last_login_at:
        member.last_login_at === null
          ? null
          : toISOStringSafe(member.last_login_at),
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at:
        member.deleted_at === null ? null : toISOStringSafe(member.deleted_at),
    } satisfies IHrmTimeTrackingMember.ISummary,
    organization: {
      id: employee.organization.id,
      name: employee.organization.name,
      description: employee.organization.description,
      logoImageUrl: employee.organization.logo_image_url,
      currency: employee.organization.currency,
      timezone: employee.organization.timezone,
      fiscalStartMonth: employee.organization.fiscal_start_month,
      createdAt: toISOStringSafe(employee.organization.created_at),
      updatedAt: toISOStringSafe(employee.organization.updated_at),
      deletedAt:
        employee.organization.deleted_at === null
          ? null
          : toISOStringSafe(employee.organization.deleted_at),
    } satisfies IHrmTimeTrackingOrganization.ISummary,
    employee: {
      id: employee.id,
      organization: {
        id: employee.organization.id,
        name: employee.organization.name,
        description: employee.organization.description,
        logoImageUrl: employee.organization.logo_image_url,
        currency: employee.organization.currency,
        timezone: employee.organization.timezone,
        fiscalStartMonth: employee.organization.fiscal_start_month,
        createdAt: toISOStringSafe(employee.organization.created_at),
        updatedAt: toISOStringSafe(employee.organization.updated_at),
        deletedAt:
          employee.organization.deleted_at === null
            ? null
            : toISOStringSafe(employee.organization.deleted_at),
      } satisfies IHrmTimeTrackingOrganization.ISummary,
      userAccount: {} as IHrmTimeTrackingUserAccount.ISummary,
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
          deletedAt:
            employee.role.organization.deleted_at === null
              ? null
              : toISOStringSafe(employee.role.organization.deleted_at),
        } satisfies IHrmTimeTrackingOrganization.ISummary,
        name: employee.role.name,
        code: employee.role.code,
        description: employee.role.description,
        isBuiltin: employee.role.is_builtin,
        sortOrder: employee.role.sort_order,
        createdAt: toISOStringSafe(employee.role.created_at),
        updatedAt: toISOStringSafe(employee.role.updated_at),
        deletedAt:
          employee.role.deleted_at === null
            ? null
            : toISOStringSafe(employee.role.deleted_at),
      } satisfies IHrmTimeTrackingRole.ISummary,
      department: null,
      positionTitle: employee.position_title,
      employmentType: employee.employment_type,
      status: employee.status,
      createdAt: toISOStringSafe(employee.created_at),
      updatedAt: toISOStringSafe(employee.updated_at),
      deletedAt:
        employee.deleted_at === null
          ? null
          : toISOStringSafe(employee.deleted_at),
    } satisfies IHrmTimeTrackingEmployee.ISummary,
    period: {
      start: null,
      end: null,
      label: null,
    } satisfies IHrmTimeTrackingDashboardPeriod,
    summary: {
      activeEmployeeCount: true,
      activeProjectCount: true,
      runningTimerSessionCount: true,
      totalTimelogCount: true,
      totalTrackedMinutes: true,
      draftTimesheetCount: true,
      submittedTimesheetCount: true,
      approvedTimesheetCount: true,
      rejectedTimesheetCount: true,
    } satisfies IHrmTimeTrackingDashboardSummary,
    timerSession: null,
    personal: {
      timerSession: null,
      currentTimesheet:
        currentTimesheet === null
          ? null
          : ({
              id: currentTimesheet.id,
              organization: {
                id: employee.organization.id,
                name: employee.organization.name,
                description: employee.organization.description,
                logoImageUrl: employee.organization.logo_image_url,
                currency: employee.organization.currency,
                timezone: employee.organization.timezone,
                fiscalStartMonth: employee.organization.fiscal_start_month,
                createdAt: toISOStringSafe(employee.organization.created_at),
                updatedAt: toISOStringSafe(employee.organization.updated_at),
                deletedAt:
                  employee.organization.deleted_at === null
                    ? null
                    : toISOStringSafe(employee.organization.deleted_at),
              } satisfies IHrmTimeTrackingOrganization.ISummary,
              employee: {
                id: employee.id,
                organization: {
                  id: employee.organization.id,
                  name: employee.organization.name,
                  description: employee.organization.description,
                  logoImageUrl: employee.organization.logo_image_url,
                  currency: employee.organization.currency,
                  timezone: employee.organization.timezone,
                  fiscalStartMonth: employee.organization.fiscal_start_month,
                  createdAt: toISOStringSafe(employee.organization.created_at),
                  updatedAt: toISOStringSafe(employee.organization.updated_at),
                  deletedAt:
                    employee.organization.deleted_at === null
                      ? null
                      : toISOStringSafe(employee.organization.deleted_at),
                } satisfies IHrmTimeTrackingOrganization.ISummary,
                userAccount: {} as IHrmTimeTrackingUserAccount.ISummary,
                role: {
                  id: employee.role.id,
                  organization: {
                    id: employee.role.organization.id,
                    name: employee.role.organization.name,
                    description: employee.role.organization.description,
                    logoImageUrl: employee.role.organization.logo_image_url,
                    currency: employee.role.organization.currency,
                    timezone: employee.role.organization.timezone,
                    fiscalStartMonth:
                      employee.role.organization.fiscal_start_month,
                    createdAt: toISOStringSafe(
                      employee.role.organization.created_at,
                    ),
                    updatedAt: toISOStringSafe(
                      employee.role.organization.updated_at,
                    ),
                    deletedAt:
                      employee.role.organization.deleted_at === null
                        ? null
                        : toISOStringSafe(
                            employee.role.organization.deleted_at,
                          ),
                  } satisfies IHrmTimeTrackingOrganization.ISummary,
                  name: employee.role.name,
                  code: employee.role.code,
                  description: employee.role.description,
                  isBuiltin: employee.role.is_builtin,
                  sortOrder: employee.role.sort_order,
                  createdAt: toISOStringSafe(employee.role.created_at),
                  updatedAt: toISOStringSafe(employee.role.updated_at),
                  deletedAt:
                    employee.role.deleted_at === null
                      ? null
                      : toISOStringSafe(employee.role.deleted_at),
                } satisfies IHrmTimeTrackingRole.ISummary,
                department: null,
                positionTitle: employee.position_title,
                employmentType: employee.employment_type,
                status: employee.status,
                createdAt: toISOStringSafe(employee.created_at),
                updatedAt: toISOStringSafe(employee.updated_at),
                deletedAt:
                  employee.deleted_at === null
                    ? null
                    : toISOStringSafe(employee.deleted_at),
              } satisfies IHrmTimeTrackingEmployee.ISummary,
              reviewedByEmployee: null,
              weekStart: toISOStringSafe(currentTimesheet.week_start),
              weekEnd: toISOStringSafe(currentTimesheet.week_end),
              status: currentTimesheet.status,
              submittedAt:
                currentTimesheet.submitted_at === null
                  ? null
                  : toISOStringSafe(currentTimesheet.submitted_at),
              reviewedAt:
                currentTimesheet.reviewed_at === null
                  ? null
                  : toISOStringSafe(currentTimesheet.reviewed_at),
              rejectionReason: false,
              createdAt: toISOStringSafe(currentTimesheet.created_at),
              updatedAt: toISOStringSafe(currentTimesheet.updated_at),
              deletedAt:
                currentTimesheet.deleted_at === null
                  ? null
                  : toISOStringSafe(currentTimesheet.deleted_at),
            } satisfies IHrmTimeTrackingTimesheet),
      weeklySummary: {
        weekStart: false,
        weekEnd: false,
        totalHours: false,
        timelogCount: false,
        employeeCount: false,
      } satisfies IHrmTimeTrackingWeeklySummaryReport,
      todayTimelogCount: false,
      recentTimelogs: false,
      activeProjectCount: false,
      activeTaskCount: false,
    } satisfies IHrmTimeTrackingDashboardPersonal,
    topProjects: topProjects.map(
      (project) =>
        ({
          project: {
            id: project.id,
            organization: {
              id: employee.organization.id,
              name: employee.organization.name,
              description: employee.organization.description,
              logoImageUrl: employee.organization.logo_image_url,
              currency: employee.organization.currency,
              timezone: employee.organization.timezone,
              fiscalStartMonth: employee.organization.fiscal_start_month,
              createdAt: toISOStringSafe(employee.organization.created_at),
              updatedAt: toISOStringSafe(employee.organization.updated_at),
              deletedAt:
                employee.organization.deleted_at === null
                  ? null
                  : toISOStringSafe(employee.organization.deleted_at),
            } satisfies IHrmTimeTrackingOrganization.ISummary,
            name: project.name,
            description: project.description,
            colorCode: project.color_code,
            status: project.status,
            budgetHours: project.budget_hours,
            startDate:
              project.start_date === null
                ? null
                : toISOStringSafe(project.start_date),
            endDate:
              project.end_date === null
                ? null
                : toISOStringSafe(project.end_date),
            createdAt: toISOStringSafe(project.created_at),
            updatedAt: toISOStringSafe(project.updated_at),
            deletedAt:
              project.deleted_at === null
                ? null
                : toISOStringSafe(project.deleted_at),
          } satisfies IHrmTimeTrackingProject.ISummary,
          tracked_hours: false,
          ranking_score: false,
          timelog_count: false,
        }) satisfies IHrmTimeTrackingDashboardTopProject,
    ),
    pendingTimesheets: [] as IHrmTimeTrackingDashboardPendingTimesheet[],
    organizationMetrics: {
      employee_count: true,
      project_count: true,
      timelog_count: true,
      submitted_timesheet_count: true,
      running_timer_count: true,
    } satisfies IHrmTimeTrackingDashboardOrganizationMetric,
    recentTimelogs: recentTimelogs.map(
      (timelog) =>
        ({
          id: true,
          work_date: true,
          duration_minutes: true,
          description: true,
          billable: timelog.billable,
          employee: {
            id: timelog.employee.id,
            organization: {
              id: employee.organization.id,
              name: employee.organization.name,
              description: employee.organization.description,
              logoImageUrl: employee.organization.logo_image_url,
              currency: employee.organization.currency,
              timezone: employee.organization.timezone,
              fiscalStartMonth: employee.organization.fiscal_start_month,
              createdAt: toISOStringSafe(employee.organization.created_at),
              updatedAt: toISOStringSafe(employee.organization.updated_at),
              deletedAt:
                employee.organization.deleted_at === null
                  ? null
                  : toISOStringSafe(employee.organization.deleted_at),
            } satisfies IHrmTimeTrackingOrganization.ISummary,
            userAccount: {} as IHrmTimeTrackingUserAccount.ISummary,
            role: {
              id: timelog.employee.role.id,
              organization: {
                id: timelog.employee.role.organization.id,
                name: timelog.employee.role.organization.name,
                description: timelog.employee.role.organization.description,
                logoImageUrl: timelog.employee.role.organization.logo_image_url,
                currency: timelog.employee.role.organization.currency,
                timezone: timelog.employee.role.organization.timezone,
                fiscalStartMonth:
                  timelog.employee.role.organization.fiscal_start_month,
                createdAt: toISOStringSafe(
                  timelog.employee.role.organization.created_at,
                ),
                updatedAt: toISOStringSafe(
                  timelog.employee.role.organization.updated_at,
                ),
                deletedAt:
                  timelog.employee.role.organization.deleted_at === null
                    ? null
                    : toISOStringSafe(
                        timelog.employee.role.organization.deleted_at,
                      ),
              } satisfies IHrmTimeTrackingOrganization.ISummary,
              name: timelog.employee.role.name,
              code: timelog.employee.role.code,
              description: timelog.employee.role.description,
              isBuiltin: timelog.employee.role.is_builtin,
              sortOrder: timelog.employee.role.sort_order,
              createdAt: toISOStringSafe(timelog.employee.role.created_at),
              updatedAt: toISOStringSafe(timelog.employee.role.updated_at),
              deletedAt:
                timelog.employee.role.deleted_at === null
                  ? null
                  : toISOStringSafe(timelog.employee.role.deleted_at),
            } satisfies IHrmTimeTrackingRole.ISummary,
            department: null,
            positionTitle: timelog.employee.position_title,
            employmentType: timelog.employee.employment_type,
            status: timelog.employee.status,
            createdAt: toISOStringSafe(timelog.employee.created_at),
            updatedAt: toISOStringSafe(timelog.employee.updated_at),
            deletedAt:
              timelog.employee.deleted_at === null
                ? null
                : toISOStringSafe(timelog.employee.deleted_at),
          } satisfies IHrmTimeTrackingEmployee.ISummary,
          project: {
            id: timelog.project.id,
            organization: {
              id: timelog.project.organization.id,
              name: timelog.project.organization.name,
              description: timelog.project.organization.description,
              logoImageUrl: timelog.project.organization.logo_image_url,
              currency: timelog.project.organization.currency,
              timezone: timelog.project.organization.timezone,
              fiscalStartMonth: timelog.project.organization.fiscal_start_month,
              createdAt: toISOStringSafe(
                timelog.project.organization.created_at,
              ),
              updatedAt: toISOStringSafe(
                timelog.project.organization.updated_at,
              ),
              deletedAt:
                timelog.project.organization.deleted_at === null
                  ? null
                  : toISOStringSafe(timelog.project.organization.deleted_at),
            } satisfies IHrmTimeTrackingOrganization.ISummary,
            name: timelog.project.name,
            description: timelog.project.description,
            colorCode: timelog.project.color_code,
            status: timelog.project.status,
            budgetHours: timelog.project.budget_hours,
            startDate:
              timelog.project.start_date === null
                ? null
                : toISOStringSafe(timelog.project.start_date),
            endDate:
              timelog.project.end_date === null
                ? null
                : toISOStringSafe(timelog.project.end_date),
            createdAt: toISOStringSafe(timelog.project.created_at),
            updatedAt: toISOStringSafe(timelog.project.updated_at),
            deletedAt:
              timelog.project.deleted_at === null
                ? null
                : toISOStringSafe(timelog.project.deleted_at),
          } satisfies IHrmTimeTrackingProject.ISummary,
          task: null,
        }) satisfies IHrmTimeTrackingDashboardRecentTimelog,
    ),
  } satisfies IHrmTimeTrackingDashboard;
}
