import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDashboard";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberDashboard(props: {
  member: MemberPayload;
}): Promise<IErpHrmDashboard> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_member_id: true },
    });
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: { erp_hrm_member_id: session.erp_hrm_member_id },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      status: true,
      erp_hrm_role_id: true,
    },
  });
  const organizationId = employee.erp_hrm_organization_id;
  const hasReportViewPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "report:view",
      },
    });
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStartMonday = new Date(today);
  weekStartMonday.setDate(today.getDate() - mondayOffset);
  const weekEndSunday = new Date(weekStartMonday);
  weekEndSunday.setDate(weekStartMonday.getDate() + 6);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    where: {
      erp_hrm_employee_id: employee.id,
      date: { gte: today, lt: tomorrow },
    },
    _sum: { duration_minutes: true },
  });
  const weekTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    where: {
      erp_hrm_employee_id: employee.id,
      date: { gte: weekStartMonday, lte: weekEndSunday },
    },
    _sum: { duration_minutes: true },
  });
  const activeTimerRecord = await MyGlobal.prisma.erp_hrm_timers.findUnique({
    where: { erp_hrm_employee_id: employee.id },
  });
  const recentTimelogsRaw = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: { erp_hrm_employee_id: employee.id },
    orderBy: { created_at: "desc" },
    take: 5,
    select: {
      id: true,
      date: true,
      duration_minutes: true,
      description: true,
      billable: true,
      created_at: true,
      updated_at: true,
      employee: {
        select: {
          id: true,
          position: true,
          employment_type: true,
          status: true,
          member: {
            select: {
              id: true,
              display_name: true,
              email: true,
              avatar_uri: true,
              phone: true,
              created_at: true,
              deleted_at: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              is_builtin: true,
              created_at: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                  timezone: true,
                  description: true,
                  logo_uri: true,
                  created_at: true,
                  owner: {
                    select: {
                      id: true,
                      display_name: true,
                      email: true,
                      avatar_uri: true,
                      phone: true,
                      created_at: true,
                      deleted_at: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color: true,
          status: true,
          budget_hours: true,
          created_at: true,
          organization: {
            select: {
              id: true,
              name: true,
              currency: true,
              timezone: true,
              description: true,
              logo_uri: true,
              created_at: true,
              owner: {
                select: {
                  id: true,
                  display_name: true,
                  email: true,
                  avatar_uri: true,
                  phone: true,
                  created_at: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      },
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          due_date: true,
          created_at: true,
          assignee: {
            select: {
              id: true,
              position: true,
              employment_type: true,
              status: true,
              member: {
                select: {
                  id: true,
                  display_name: true,
                  email: true,
                  avatar_uri: true,
                  phone: true,
                  created_at: true,
                  deleted_at: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                  is_builtin: true,
                  created_at: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                      currency: true,
                      timezone: true,
                      description: true,
                      logo_uri: true,
                      created_at: true,
                      owner: {
                        select: {
                          id: true,
                          display_name: true,
                          email: true,
                          avatar_uri: true,
                          phone: true,
                          created_at: true,
                          deleted_at: true,
                        },
                      },
                    },
                  },
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const pendingTimesheetRecord =
    await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
      where: {
        erp_hrm_employee_id: employee.id,
        week_start_date: weekStartMonday,
        status: { in: ["draft", "submitted"] },
      },
    });
  const assignedTasksRaw = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where: {
      erp_hrm_employee_id: employee.id,
      status: { in: ["open", "in-progress"] },
    },
    orderBy: [{ due_date: "asc" }, { priority: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      due_date: true,
      created_at: true,
      assignee: {
        select: {
          id: true,
          position: true,
          employment_type: true,
          status: true,
          member: {
            select: {
              id: true,
              display_name: true,
              email: true,
              avatar_uri: true,
              phone: true,
              created_at: true,
              deleted_at: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              is_builtin: true,
              created_at: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                  timezone: true,
                  description: true,
                  logo_uri: true,
                  created_at: true,
                  owner: {
                    select: {
                      id: true,
                      display_name: true,
                      email: true,
                      avatar_uri: true,
                      phone: true,
                      created_at: true,
                      deleted_at: true,
                    },
                  },
                },
              },
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });
  let organizationalMetrics:
    | IErpHrmDashboard.IOrganizationalMetric
    | undefined = undefined;
  if (hasReportViewPermission) {
    const activeEmployeeCount = await MyGlobal.prisma.erp_hrm_employees.count({
      where: {
        erp_hrm_organization_id: organizationId,
        status: "active",
        deleted_at: null,
      },
    });
    const totalHoursResult = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
      where: {
        employee: { erp_hrm_organization_id: organizationId },
        date: { gte: weekStartMonday, lte: weekEndSunday },
      },
      _sum: { duration_minutes: true },
    });
    const pendingApprovalCount = await MyGlobal.prisma.erp_hrm_timesheets.count(
      {
        where: {
          employee: { erp_hrm_organization_id: organizationId },
          status: "submitted",
        },
      },
    );
    const projectsWithBudget = await MyGlobal.prisma.erp_hrm_projects.findMany({
      where: {
        erp_hrm_organization_id: organizationId,
        budget_hours: { not: null },
      },
      select: {
        id: true,
        name: true,
        budget_hours: true,
        timelogs: {
          where: { date: { gte: weekStartMonday, lte: weekEndSunday } },
          select: { duration_minutes: true },
        },
      },
    });
    const budgetUtilizationOver80Percent: IErpHrmDashboard.IBudgetUtilizationItem[] =
      projectsWithBudget
        .filter((p) => {
          const actualHours =
            p.timelogs.reduce((s, t) => s + t.duration_minutes, 0) / 60.0;
          return p.budget_hours !== null && actualHours >= p.budget_hours * 0.8;
        })
        .map((p) => ({
          id: p.id as string & tags.Format<"uuid">,
          name: p.name,
          budgetHours: p.budget_hours as number,
          actualHours:
            p.timelogs.reduce((s, t) => s + t.duration_minutes, 0) / 60.0,
        }));
    const topEmployeeHours = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
      by: ["erp_hrm_employee_id"],
      where: {
        employee: { erp_hrm_organization_id: organizationId },
        date: { gte: weekStartMonday, lte: weekEndSunday },
      },
      _sum: { duration_minutes: true },
      orderBy: { _sum: { duration_minutes: "desc" } },
      take: 5,
    });
    const top5Performers: IErpHrmDashboard.ITopPerformer[] = [];
    if (topEmployeeHours.length > 0) {
      const topEmployees = await MyGlobal.prisma.erp_hrm_employees.findMany({
        where: {
          id: { in: topEmployeeHours.map((h) => h.erp_hrm_employee_id) },
        },
        select: { id: true, member: { select: { display_name: true } } },
      });
      for (const hourData of topEmployeeHours) {
        const emp = topEmployees.find(
          (e) => e.id === hourData.erp_hrm_employee_id,
        );
        if (emp) {
          top5Performers.push({
            employeeId: emp.id as string & tags.Format<"uuid">,
            displayName: emp.member.display_name,
            hours: (hourData._sum.duration_minutes ?? 0) / 60.0,
          });
        }
      }
    }
    organizationalMetrics = {
      activeEmployeeCount: activeEmployeeCount as number & tags.Type<"int32">,
      totalHoursThisWeek: (totalHoursResult._sum.duration_minutes ?? 0) / 60.0,
      pendingApprovalCount: pendingApprovalCount as number & tags.Type<"int32">,
      budgetUtilizationOver80Percent,
      top5Performers,
    };
  }
  const recentTimelogsTransformed: IErpHrmTimelog.ISummary[] =
    await ArrayUtil.asyncMap(
      recentTimelogsRaw,
      async (tl): Promise<IErpHrmTimelog.ISummary> => {
        const projectTotalTimelogsCount =
          await MyGlobal.prisma.erp_hrm_timelogs.count({
            where: { erp_hrm_project_id: tl.project.id },
          });
        return {
          groupBy: "project",
          totalMinutes: tl.duration_minutes,
          billableMinutes: tl.billable ? tl.duration_minutes : 0,
          nonBillableMinutes: tl.billable ? 0 : tl.duration_minutes,
          timelogCount: 1,
          project: {
            id: tl.project.id as string & tags.Format<"uuid">,
            name: tl.project.name,
            color: tl.project.color,
            status: tl.project.status,
            budgetHours: tl.project.budget_hours,
            createdAt: tl.project.created_at.toISOString() as string &
              tags.Format<"date-time">,
            organization: {
              id: tl.project.organization.id as string & tags.Format<"uuid">,
              name: tl.project.organization.name,
              currency: tl.project.organization.currency,
              timezone: tl.project.organization.timezone,
              description: tl.project.organization.description ?? null,
              created_at:
                tl.project.organization.created_at.toISOString() as string &
                  tags.Format<"date-time">,
              owner: {
                id: tl.project.organization.owner.id as string &
                  tags.Format<"uuid">,
                displayName: tl.project.organization.owner.display_name,
                email: tl.project.organization.owner.email as string &
                  tags.Format<"email">,
                createdAt:
                  tl.project.organization.owner.created_at.toISOString() as string &
                    tags.Format<"date-time">,
                avatarUri: tl.project.organization.owner.avatar_uri ?? null,
                phone: tl.project.organization.owner.phone ?? null,
                deletedAt:
                  tl.project.organization.owner.deleted_at?.toISOString() ??
                  null,
              },
            },
            totalTimelogsCount: projectTotalTimelogsCount as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
          },
          employee: tl.employee
            ? {
                id: tl.employee.id as string & tags.Format<"uuid">,
                position: tl.employee.position ?? null,
                employmentType: tl.employee.employment_type,
                status: tl.employee.status,
                member: {
                  id: tl.employee.member.id as string & tags.Format<"uuid">,
                  displayName: tl.employee.member.display_name,
                  email: tl.employee.member.email as string &
                    tags.Format<"email">,
                  createdAt:
                    tl.employee.member.created_at.toISOString() as string &
                      tags.Format<"date-time">,
                  avatarUri: tl.employee.member.avatar_uri ?? null,
                  phone: tl.employee.member.phone ?? null,
                  deletedAt:
                    tl.employee.member.deleted_at?.toISOString() ?? null,
                },
                role: {
                  id: tl.employee.role.id as string & tags.Format<"uuid">,
                  name: tl.employee.role.name,
                  isBuiltin: tl.employee.role.is_builtin,
                  createdAt:
                    tl.employee.role.created_at.toISOString() as string &
                      tags.Format<"date-time">,
                  organization: {
                    id: tl.employee.role.organization.id as string &
                      tags.Format<"uuid">,
                    name: tl.employee.role.organization.name,
                    currency: tl.employee.role.organization.currency,
                    timezone: tl.employee.role.organization.timezone,
                    description:
                      tl.employee.role.organization.description ?? null,
                    created_at:
                      tl.employee.role.organization.created_at.toISOString() as string &
                        tags.Format<"date-time">,
                    owner: {
                      id: tl.employee.role.organization.owner.id as string &
                        tags.Format<"uuid">,
                      displayName:
                        tl.employee.role.organization.owner.display_name,
                      email: tl.employee.role.organization.owner
                        .email as string & tags.Format<"email">,
                      createdAt:
                        tl.employee.role.organization.owner.created_at.toISOString() as string &
                          tags.Format<"date-time">,
                      avatarUri:
                        tl.employee.role.organization.owner.avatar_uri ?? null,
                      phone: tl.employee.role.organization.owner.phone ?? null,
                      deletedAt:
                        tl.employee.role.organization.owner.deleted_at?.toISOString() ??
                        null,
                    },
                  },
                  permissionsCount: 0 as number & tags.Type<"int32">,
                },
              }
            : undefined,
          task: tl.task
            ? {
                id: tl.task.id as string & tags.Format<"uuid">,
                title: tl.task.title,
                status: tl.task.status,
                priority: tl.task.priority,
                due_date: tl.task.due_date?.toISOString() ?? null,
                created_at: tl.task.created_at.toISOString() as string &
                  tags.Format<"date-time">,
                assignee: tl.task.assignee
                  ? {
                      id: tl.task.assignee.id as string & tags.Format<"uuid">,
                      position: tl.task.assignee.position ?? null,
                      employmentType: tl.task.assignee.employment_type,
                      status: tl.task.assignee.status,
                      member: {
                        id: tl.task.assignee.member.id as string &
                          tags.Format<"uuid">,
                        displayName: tl.task.assignee.member.display_name,
                        email: tl.task.assignee.member.email as string &
                          tags.Format<"email">,
                        createdAt:
                          tl.task.assignee.member.created_at.toISOString() as string &
                            tags.Format<"date-time">,
                        avatarUri: tl.task.assignee.member.avatar_uri ?? null,
                        phone: tl.task.assignee.member.phone ?? null,
                        deletedAt:
                          tl.task.assignee.member.deleted_at?.toISOString() ??
                          null,
                      },
                      role: {
                        id: tl.task.assignee.role.id as string &
                          tags.Format<"uuid">,
                        name: tl.task.assignee.role.name,
                        isBuiltin: tl.task.assignee.role.is_builtin,
                        createdAt:
                          tl.task.assignee.role.created_at.toISOString() as string &
                            tags.Format<"date-time">,
                        organization: {
                          id: tl.task.assignee.role.organization.id as string &
                            tags.Format<"uuid">,
                          name: tl.task.assignee.role.organization.name,
                          currency: tl.task.assignee.role.organization.currency,
                          timezone: tl.task.assignee.role.organization.timezone,
                          description:
                            tl.task.assignee.role.organization.description ??
                            null,
                          created_at:
                            tl.task.assignee.role.organization.created_at.toISOString() as string &
                              tags.Format<"date-time">,
                          owner: {
                            id: tl.task.assignee.role.organization.owner
                              .id as string & tags.Format<"uuid">,
                            displayName:
                              tl.task.assignee.role.organization.owner
                                .display_name,
                            email: tl.task.assignee.role.organization.owner
                              .email as string & tags.Format<"email">,
                            createdAt:
                              tl.task.assignee.role.organization.owner.created_at.toISOString() as string &
                                tags.Format<"date-time">,
                            avatarUri:
                              tl.task.assignee.role.organization.owner
                                .avatar_uri ?? null,
                            phone:
                              tl.task.assignee.role.organization.owner.phone ??
                              null,
                            deletedAt:
                              tl.task.assignee.role.organization.owner.deleted_at?.toISOString() ??
                              null,
                          },
                        },
                        permissionsCount: 0 as number & tags.Type<"int32">,
                      },
                      department: tl.task.assignee.department
                        ? {
                            id: tl.task.assignee.department.id as string &
                              tags.Format<"uuid">,
                            name: tl.task.assignee.department.name,
                            description:
                              tl.task.assignee.department.description ?? null,
                            created_at:
                              tl.task.assignee.department.created_at.toISOString() as string &
                                tags.Format<"date-time">,
                            updated_at:
                              tl.task.assignee.department.updated_at.toISOString() as string &
                                tags.Format<"date-time">,
                          }
                        : null,
                    }
                  : null,
              }
            : undefined,
        };
      },
    );
  let activeTimerTransformed: IErpHrmTimer.ISummary | null = null;
  if (activeTimerRecord) {
    const timerWithRelations =
      await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
        where: { id: activeTimerRecord.id },
        select: {
          id: true,
          started_at: true,
          description: true,
          project: {
            select: {
              id: true,
              name: true,
              color: true,
              status: true,
              budget_hours: true,
              created_at: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                  timezone: true,
                  description: true,
                  logo_uri: true,
                  created_at: true,
                  owner: {
                    select: {
                      id: true,
                      display_name: true,
                      email: true,
                      avatar_uri: true,
                      phone: true,
                      created_at: true,
                      deleted_at: true,
                    },
                  },
                },
              },
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              due_date: true,
              created_at: true,
              assignee: {
                select: {
                  id: true,
                  position: true,
                  employment_type: true,
                  status: true,
                  member: {
                    select: {
                      id: true,
                      display_name: true,
                      email: true,
                      avatar_uri: true,
                      phone: true,
                      created_at: true,
                      deleted_at: true,
                    },
                  },
                  role: {
                    select: {
                      id: true,
                      name: true,
                      is_builtin: true,
                      created_at: true,
                      organization: {
                        select: {
                          id: true,
                          name: true,
                          currency: true,
                          timezone: true,
                          description: true,
                          logo_uri: true,
                          created_at: true,
                          owner: {
                            select: {
                              id: true,
                              display_name: true,
                              email: true,
                              avatar_uri: true,
                              phone: true,
                              created_at: true,
                              deleted_at: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  department: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      created_at: true,
                      updated_at: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    activeTimerTransformed = {
      id: timerWithRelations.id as string & tags.Format<"uuid">,
      startedAt: timerWithRelations.started_at.toISOString() as string &
        tags.Format<"date-time">,
      project: {
        id: timerWithRelations.project.id as string & tags.Format<"uuid">,
        name: timerWithRelations.project.name,
        color: timerWithRelations.project.color,
        status: timerWithRelations.project.status,
        budgetHours: timerWithRelations.project.budget_hours,
        createdAt:
          timerWithRelations.project.created_at.toISOString() as string &
            tags.Format<"date-time">,
        organization: {
          id: timerWithRelations.project.organization.id as string &
            tags.Format<"uuid">,
          name: timerWithRelations.project.organization.name,
          currency: timerWithRelations.project.organization.currency,
          timezone: timerWithRelations.project.organization.timezone,
          description:
            timerWithRelations.project.organization.description ?? null,
          created_at:
            timerWithRelations.project.organization.created_at.toISOString() as string &
              tags.Format<"date-time">,
          owner: {
            id: timerWithRelations.project.organization.owner.id as string &
              tags.Format<"uuid">,
            displayName:
              timerWithRelations.project.organization.owner.display_name,
            email: timerWithRelations.project.organization.owner
              .email as string & tags.Format<"email">,
            createdAt:
              timerWithRelations.project.organization.owner.created_at.toISOString() as string &
                tags.Format<"date-time">,
            avatarUri:
              timerWithRelations.project.organization.owner.avatar_uri ?? null,
            phone: timerWithRelations.project.organization.owner.phone ?? null,
            deletedAt:
              timerWithRelations.project.organization.owner.deleted_at?.toISOString() ??
              null,
          },
          logo_uri: timerWithRelations.project.organization.logo_uri ?? null,
        },
        totalTimelogsCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      },
      task: timerWithRelations.task
        ? {
            id: timerWithRelations.task.id as string & tags.Format<"uuid">,
            title: timerWithRelations.task.title,
            status: timerWithRelations.task.status,
            priority: timerWithRelations.task.priority,
            due_date: timerWithRelations.task.due_date?.toISOString() ?? null,
            created_at:
              timerWithRelations.task.created_at.toISOString() as string &
                tags.Format<"date-time">,
            assignee: timerWithRelations.task.assignee
              ? {
                  id: timerWithRelations.task.assignee.id as string &
                    tags.Format<"uuid">,
                  position: timerWithRelations.task.assignee.position ?? null,
                  employmentType:
                    timerWithRelations.task.assignee.employment_type,
                  status: timerWithRelations.task.assignee.status,
                  member: {
                    id: timerWithRelations.task.assignee.member.id as string &
                      tags.Format<"uuid">,
                    displayName:
                      timerWithRelations.task.assignee.member.display_name,
                    email: timerWithRelations.task.assignee.member
                      .email as string & tags.Format<"email">,
                    createdAt:
                      timerWithRelations.task.assignee.member.created_at.toISOString() as string &
                        tags.Format<"date-time">,
                    avatarUri:
                      timerWithRelations.task.assignee.member.avatar_uri ??
                      null,
                    phone:
                      timerWithRelations.task.assignee.member.phone ?? null,
                    deletedAt:
                      timerWithRelations.task.assignee.member.deleted_at?.toISOString() ??
                      null,
                  },
                  role: {
                    id: timerWithRelations.task.assignee.role.id as string &
                      tags.Format<"uuid">,
                    name: timerWithRelations.task.assignee.role.name,
                    isBuiltin: timerWithRelations.task.assignee.role.is_builtin,
                    createdAt:
                      timerWithRelations.task.assignee.role.created_at.toISOString() as string &
                        tags.Format<"date-time">,
                    organization: {
                      id: timerWithRelations.task.assignee.role.organization
                        .id as string & tags.Format<"uuid">,
                      name: timerWithRelations.task.assignee.role.organization
                        .name,
                      currency:
                        timerWithRelations.task.assignee.role.organization
                          .currency,
                      timezone:
                        timerWithRelations.task.assignee.role.organization
                          .timezone,
                      description:
                        timerWithRelations.task.assignee.role.organization
                          .description ?? null,
                      created_at:
                        timerWithRelations.task.assignee.role.organization.created_at.toISOString() as string &
                          tags.Format<"date-time">,
                      owner: {
                        id: timerWithRelations.task.assignee.role.organization
                          .owner.id as string & tags.Format<"uuid">,
                        displayName:
                          timerWithRelations.task.assignee.role.organization
                            .owner.display_name,
                        email: timerWithRelations.task.assignee.role
                          .organization.owner.email as string &
                          tags.Format<"email">,
                        createdAt:
                          timerWithRelations.task.assignee.role.organization.owner.created_at.toISOString() as string &
                            tags.Format<"date-time">,
                        avatarUri:
                          timerWithRelations.task.assignee.role.organization
                            .owner.avatar_uri ?? null,
                        phone:
                          timerWithRelations.task.assignee.role.organization
                            .owner.phone ?? null,
                        deletedAt:
                          timerWithRelations.task.assignee.role.organization.owner.deleted_at?.toISOString() ??
                          null,
                      },
                    },
                    permissionsCount: 0 as number & tags.Type<"int32">,
                  },
                  department: timerWithRelations.task.assignee.department
                    ? {
                        id: timerWithRelations.task.assignee.department
                          .id as string & tags.Format<"uuid">,
                        name: timerWithRelations.task.assignee.department.name,
                        description:
                          timerWithRelations.task.assignee.department
                            .description ?? null,
                        created_at:
                          timerWithRelations.task.assignee.department.created_at.toISOString() as string &
                            tags.Format<"date-time">,
                        updated_at:
                          timerWithRelations.task.assignee.department.updated_at.toISOString() as string &
                            tags.Format<"date-time">,
                      }
                    : null,
                }
              : null,
          }
        : null,
      description: timerWithRelations.description ?? null,
    };
  }
  let pendingTimesheetTransformed: IErpHrmTimesheet.ISummary | undefined =
    undefined;
  if (pendingTimesheetRecord) {
    const timesheetWithRelations =
      await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
        where: { id: pendingTimesheetRecord.id },
        select: {
          id: true,
          week_start_date: true,
          week_end_date: true,
          status: true,
          total_hours: true,
          submitted_at: true,
          reviewed_at: true,
          rejection_reason: true,
          created_at: true,
          employee: {
            select: {
              id: true,
              position: true,
              employment_type: true,
              status: true,
              member: {
                select: {
                  id: true,
                  display_name: true,
                  email: true,
                  avatar_uri: true,
                  phone: true,
                  created_at: true,
                  deleted_at: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                  is_builtin: true,
                  created_at: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                      currency: true,
                      timezone: true,
                      description: true,
                      logo_uri: true,
                      created_at: true,
                      owner: {
                        select: {
                          id: true,
                          display_name: true,
                          email: true,
                          avatar_uri: true,
                          phone: true,
                          created_at: true,
                          deleted_at: true,
                        },
                      },
                    },
                  },
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                },
              },
            },
          },
          reviewerEmployee: {
            select: {
              id: true,
              position: true,
              employment_type: true,
              status: true,
              member: {
                select: {
                  id: true,
                  display_name: true,
                  email: true,
                  avatar_uri: true,
                  phone: true,
                  created_at: true,
                  deleted_at: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                  is_builtin: true,
                  created_at: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                      currency: true,
                      timezone: true,
                      description: true,
                      logo_uri: true,
                      created_at: true,
                      owner: {
                        select: {
                          id: true,
                          display_name: true,
                          email: true,
                          avatar_uri: true,
                          phone: true,
                          created_at: true,
                          deleted_at: true,
                        },
                      },
                    },
                  },
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                },
              },
            },
          },
        },
      });
    pendingTimesheetTransformed = {
      id: timesheetWithRelations.id as string & tags.Format<"uuid">,
      weekStartDate:
        timesheetWithRelations.week_start_date.toISOString() as string &
          tags.Format<"date-time">,
      weekEndDate:
        timesheetWithRelations.week_end_date.toISOString() as string &
          tags.Format<"date-time">,
      status: timesheetWithRelations.status,
      totalHours: timesheetWithRelations.total_hours,
      submittedAt: timesheetWithRelations.submitted_at?.toISOString() ?? null,
      reviewedAt: timesheetWithRelations.reviewed_at?.toISOString() ?? null,
      rejectionReason: timesheetWithRelations.rejection_reason ?? null,
      createdAt: timesheetWithRelations.created_at.toISOString() as string &
        tags.Format<"date-time">,
      employee: {
        id: timesheetWithRelations.employee.id as string & tags.Format<"uuid">,
        position: timesheetWithRelations.employee.position ?? null,
        employmentType: timesheetWithRelations.employee.employment_type,
        status: timesheetWithRelations.employee.status,
        member: {
          id: timesheetWithRelations.employee.member.id as string &
            tags.Format<"uuid">,
          displayName: timesheetWithRelations.employee.member.display_name,
          email: timesheetWithRelations.employee.member.email as string &
            tags.Format<"email">,
          createdAt:
            timesheetWithRelations.employee.member.created_at.toISOString() as string &
              tags.Format<"date-time">,
          avatarUri: timesheetWithRelations.employee.member.avatar_uri ?? null,
          phone: timesheetWithRelations.employee.member.phone ?? null,
          deletedAt:
            timesheetWithRelations.employee.member.deleted_at?.toISOString() ??
            null,
        },
        role: {
          id: timesheetWithRelations.employee.role.id as string &
            tags.Format<"uuid">,
          name: timesheetWithRelations.employee.role.name,
          isBuiltin: timesheetWithRelations.employee.role.is_builtin,
          createdAt:
            timesheetWithRelations.employee.role.created_at.toISOString() as string &
              tags.Format<"date-time">,
          organization: {
            id: timesheetWithRelations.employee.role.organization.id as string &
              tags.Format<"uuid">,
            name: timesheetWithRelations.employee.role.organization.name,
            currency:
              timesheetWithRelations.employee.role.organization.currency,
            timezone:
              timesheetWithRelations.employee.role.organization.timezone,
            description:
              timesheetWithRelations.employee.role.organization.description ??
              null,
            created_at:
              timesheetWithRelations.employee.role.organization.created_at.toISOString() as string &
                tags.Format<"date-time">,
            owner: {
              id: timesheetWithRelations.employee.role.organization.owner
                .id as string & tags.Format<"uuid">,
              displayName:
                timesheetWithRelations.employee.role.organization.owner
                  .display_name,
              email: timesheetWithRelations.employee.role.organization.owner
                .email as string & tags.Format<"email">,
              createdAt:
                timesheetWithRelations.employee.role.organization.owner.created_at.toISOString() as string &
                  tags.Format<"date-time">,
              avatarUri:
                timesheetWithRelations.employee.role.organization.owner
                  .avatar_uri ?? null,
              phone:
                timesheetWithRelations.employee.role.organization.owner.phone ??
                null,
              deletedAt:
                timesheetWithRelations.employee.role.organization.owner.deleted_at?.toISOString() ??
                null,
            },
            logo_uri:
              timesheetWithRelations.employee.role.organization.logo_uri ??
              null,
          },
          permissionsCount: 0 as number & tags.Type<"int32">,
        },
        department: timesheetWithRelations.employee.department
          ? {
              id: timesheetWithRelations.employee.department.id as string &
                tags.Format<"uuid">,
              name: timesheetWithRelations.employee.department.name,
              description:
                timesheetWithRelations.employee.department.description ?? null,
              created_at:
                timesheetWithRelations.employee.department.created_at.toISOString() as string &
                  tags.Format<"date-time">,
              updated_at:
                timesheetWithRelations.employee.department.updated_at.toISOString() as string &
                  tags.Format<"date-time">,
              parent: null,
            }
          : undefined,
      },
      reviewerEmployee: timesheetWithRelations.reviewerEmployee
        ? {
            id: timesheetWithRelations.reviewerEmployee.id as string &
              tags.Format<"uuid">,
            position: timesheetWithRelations.reviewerEmployee.position ?? null,
            employmentType:
              timesheetWithRelations.reviewerEmployee.employment_type,
            status: timesheetWithRelations.reviewerEmployee.status,
            member: {
              id: timesheetWithRelations.reviewerEmployee.member.id as string &
                tags.Format<"uuid">,
              displayName:
                timesheetWithRelations.reviewerEmployee.member.display_name,
              email: timesheetWithRelations.reviewerEmployee.member
                .email as string & tags.Format<"email">,
              createdAt:
                timesheetWithRelations.reviewerEmployee.member.created_at.toISOString() as string &
                  tags.Format<"date-time">,
              avatarUri:
                timesheetWithRelations.reviewerEmployee.member.avatar_uri ??
                null,
              phone:
                timesheetWithRelations.reviewerEmployee.member.phone ?? null,
              deletedAt:
                timesheetWithRelations.reviewerEmployee.member.deleted_at?.toISOString() ??
                null,
            },
            role: {
              id: timesheetWithRelations.reviewerEmployee.role.id as string &
                tags.Format<"uuid">,
              name: timesheetWithRelations.reviewerEmployee.role.name,
              isBuiltin:
                timesheetWithRelations.reviewerEmployee.role.is_builtin,
              createdAt:
                timesheetWithRelations.reviewerEmployee.role.created_at.toISOString() as string &
                  tags.Format<"date-time">,
              organization: {
                id: timesheetWithRelations.reviewerEmployee.role.organization
                  .id as string & tags.Format<"uuid">,
                name: timesheetWithRelations.reviewerEmployee.role.organization
                  .name,
                currency:
                  timesheetWithRelations.reviewerEmployee.role.organization
                    .currency,
                timezone:
                  timesheetWithRelations.reviewerEmployee.role.organization
                    .timezone,
                description:
                  timesheetWithRelations.reviewerEmployee.role.organization
                    .description ?? null,
                created_at:
                  timesheetWithRelations.reviewerEmployee.role.organization.created_at.toISOString() as string &
                    tags.Format<"date-time">,
                owner: {
                  id: timesheetWithRelations.reviewerEmployee.role.organization
                    .owner.id as string & tags.Format<"uuid">,
                  displayName:
                    timesheetWithRelations.reviewerEmployee.role.organization
                      .owner.display_name,
                  email: timesheetWithRelations.reviewerEmployee.role
                    .organization.owner.email as string & tags.Format<"email">,
                  createdAt:
                    timesheetWithRelations.reviewerEmployee.role.organization.owner.created_at.toISOString() as string &
                      tags.Format<"date-time">,
                  avatarUri:
                    timesheetWithRelations.reviewerEmployee.role.organization
                      .owner.avatar_uri ?? null,
                  phone:
                    timesheetWithRelations.reviewerEmployee.role.organization
                      .owner.phone ?? null,
                  deletedAt:
                    timesheetWithRelations.reviewerEmployee.role.organization.owner.deleted_at?.toISOString() ??
                    null,
                },
                logo_uri:
                  timesheetWithRelations.reviewerEmployee.role.organization
                    .logo_uri ?? null,
              },
              permissionsCount: 0 as number & tags.Type<"int32">,
            },
            department: timesheetWithRelations.reviewerEmployee.department
              ? {
                  id: timesheetWithRelations.reviewerEmployee.department
                    .id as string & tags.Format<"uuid">,
                  name: timesheetWithRelations.reviewerEmployee.department.name,
                  description:
                    timesheetWithRelations.reviewerEmployee.department
                      .description ?? null,
                  created_at:
                    timesheetWithRelations.reviewerEmployee.department.created_at.toISOString() as string &
                      tags.Format<"date-time">,
                  updated_at:
                    timesheetWithRelations.reviewerEmployee.department.updated_at.toISOString() as string &
                      tags.Format<"date-time">,
                  parent: null,
                }
              : null,
          }
        : null,
    };
  }
  const assignedTasksTransformed: IErpHrmTask.ISummary[] =
    await ArrayUtil.asyncMap(
      assignedTasksRaw,
      async (t): Promise<IErpHrmTask.ISummary> => {
        return {
          id: t.id as string & tags.Format<"uuid">,
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date?.toISOString() ?? null,
          created_at: t.created_at.toISOString() as string &
            tags.Format<"date-time">,
          assignee: t.assignee
            ? {
                id: t.assignee.id as string & tags.Format<"uuid">,
                position: t.assignee.position ?? null,
                employmentType: t.assignee.employment_type,
                status: t.assignee.status,
                member: {
                  id: t.assignee.member.id as string & tags.Format<"uuid">,
                  displayName: t.assignee.member.display_name,
                  email: t.assignee.member.email as string &
                    tags.Format<"email">,
                  createdAt:
                    t.assignee.member.created_at.toISOString() as string &
                      tags.Format<"date-time">,
                  avatarUri: t.assignee.member.avatar_uri ?? null,
                  phone: t.assignee.member.phone ?? null,
                  deletedAt:
                    t.assignee.member.deleted_at?.toISOString() ?? null,
                },
                role: {
                  id: t.assignee.role.id as string & tags.Format<"uuid">,
                  name: t.assignee.role.name,
                  isBuiltin: t.assignee.role.is_builtin,
                  createdAt:
                    t.assignee.role.created_at.toISOString() as string &
                      tags.Format<"date-time">,
                  organization: {
                    id: t.assignee.role.organization.id as string &
                      tags.Format<"uuid">,
                    name: t.assignee.role.organization.name,
                    currency: t.assignee.role.organization.currency,
                    timezone: t.assignee.role.organization.timezone,
                    description:
                      t.assignee.role.organization.description ?? null,
                    created_at:
                      t.assignee.role.organization.created_at.toISOString() as string &
                        tags.Format<"date-time">,
                    owner: {
                      id: t.assignee.role.organization.owner.id as string &
                        tags.Format<"uuid">,
                      displayName:
                        t.assignee.role.organization.owner.display_name,
                      email: t.assignee.role.organization.owner
                        .email as string & tags.Format<"email">,
                      createdAt:
                        t.assignee.role.organization.owner.created_at.toISOString() as string &
                          tags.Format<"date-time">,
                      avatarUri:
                        t.assignee.role.organization.owner.avatar_uri ?? null,
                      phone: t.assignee.role.organization.owner.phone ?? null,
                      deletedAt:
                        t.assignee.role.organization.owner.deleted_at?.toISOString() ??
                        null,
                    },
                  },
                  permissionsCount: 0 as number & tags.Type<"int32">,
                },
                department: t.assignee.department
                  ? {
                      id: t.assignee.department.id as string &
                        tags.Format<"uuid">,
                      name: t.assignee.department.name,
                      description: t.assignee.department.description ?? null,
                      created_at:
                        t.assignee.department.created_at.toISOString() as string &
                          tags.Format<"date-time">,
                      updated_at:
                        t.assignee.department.updated_at.toISOString() as string &
                          tags.Format<"date-time">,
                      parent: null,
                    }
                  : null,
              }
            : null,
        };
      },
    );
  return {
    personalMetrics: {
      hoursToday: todayTimelogs._sum.duration_minutes ?? 0,
      hoursThisWeek: weekTimelogs._sum.duration_minutes ?? 0,
      activeTimer: activeTimerTransformed,
      recentTimelogs: recentTimelogsTransformed,
      pendingTimesheet: pendingTimesheetTransformed,
      assignedTasks: assignedTasksTransformed,
    },
    organizationalMetrics,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDashboard";
// import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberDashboard(props: {
//   member: MemberPayload;
// }): Promise<IErpHrmDashboard> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------