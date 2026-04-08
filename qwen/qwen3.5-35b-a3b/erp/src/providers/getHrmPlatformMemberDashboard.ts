import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
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

export async function getHrmPlatformMemberDashboard(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformDashboard> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  const nowDate = new Date();
  const currentYear = nowDate.getUTCFullYear();
  const currentMonth = nowDate.getUTCMonth() + 1;
  const currentDay = nowDate.getUTCDate();
  const todayStart: string & tags.Format<"date-time"> =
    `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}T00:00:00.000Z`;
  const todayEnd: string & tags.Format<"date-time"> =
    `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}T23:59:59.999Z`;
  const todayTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      employee_id: employee.id,
      start_datetime: {
        gte: todayStart,
        lte: todayEnd,
      },
      deleted_at: null,
    },
  });
  const hoursLoggedToday =
    todayTimelogs.reduce((sum: number, t) => sum + t.duration_minutes, 0) / 60;
  const dayOfWeek = nowDate.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayDate = new Date(nowDate);
  mondayDate.setUTCDate(mondayDate.getUTCDate() + mondayOffset);
  const weekStartYear = mondayDate.getUTCFullYear();
  const weekStartMonth = mondayDate.getUTCMonth() + 1;
  const weekStartDay = mondayDate.getUTCDate();
  const weekEndDay = weekStartDay + 6;
  const weekStart: string & tags.Format<"date-time"> =
    `${weekStartYear}-${String(weekStartMonth).padStart(2, "0")}-${String(weekStartDay).padStart(2, "0")}T00:00:00.000Z`;
  const weekEnd: string & tags.Format<"date-time"> =
    `${weekStartYear}-${String(weekStartMonth).padStart(2, "0")}-${String(weekEndDay).padStart(2, "0")}T23:59:59.999Z`;
  const weekTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      employee_id: employee.id,
      start_datetime: {
        gte: weekStart,
        lte: weekEnd,
      },
      deleted_at: null,
    },
  });
  const hoursLoggedThisWeek =
    weekTimelogs.reduce((sum: number, t) => sum + t.duration_minutes, 0) / 60;
  const activeTimerRecord = await MyGlobal.prisma.hrm_platform_timers.findFirst(
    {
      where: {
        hrm_platform_employee_id: employee.id,
        status: "started",
        deleted_at: null,
      },
      include: {
        project: true,
        task: true,
      },
    },
  );
  const activeTimer: IHrmPlatformTimer.ISummary | null = activeTimerRecord
    ? ({
        id: activeTimerRecord.id,
        status: activeTimerRecord.status,
        lastTickAt: toISOStringSafe(activeTimerRecord.last_tick_at),
        durationSeconds: activeTimerRecord.duration_seconds,
        createdAt: toISOStringSafe(activeTimerRecord.created_at),
        updatedAt: toISOStringSafe(activeTimerRecord.updated_at),
        deletedAt: activeTimerRecord.deleted_at
          ? toISOStringSafe(activeTimerRecord.deleted_at)
          : null,
        project: activeTimerRecord.project
          ? ({
              id: activeTimerRecord.project.id,
              name: activeTimerRecord.project.name,
              status: activeTimerRecord.project.status,
              color_code: activeTimerRecord.project.color_code,
              budget_hours: activeTimerRecord.project.budget_hours,
              start_date: activeTimerRecord.project.start_date
                ? toISOStringSafe(activeTimerRecord.project.start_date)
                : null,
              end_date: activeTimerRecord.project.end_date
                ? toISOStringSafe(activeTimerRecord.project.end_date)
                : null,
              description: activeTimerRecord.project.description ?? null,
              total_hours: 0,
              billable_hours: 0,
              non_billable_hours: 0,
              timelog_count: 0,
              employee_count: 0,
              budget_utilization: null,
              created_at: toISOStringSafe(activeTimerRecord.project.created_at),
              updated_at: toISOStringSafe(activeTimerRecord.project.updated_at),
            } satisfies IHrmPlatformProject.ISummary)
          : null,
        task: activeTimerRecord.task
          ? ({
              id: activeTimerRecord.task.id,
              title: activeTimerRecord.task.title,
              status: activeTimerRecord.task.status,
              priority: activeTimerRecord.task.priority,
              created_at: toISOStringSafe(activeTimerRecord.task.created_at),
              due_date: activeTimerRecord.task.due_date
                ? toISOStringSafe(activeTimerRecord.task.due_date)
                : null,
              project: {
                id: activeTimerRecord.task.project_id,
                name: "",
                status: "",
                color_code: "",
                budget_hours: null,
                start_date: null,
                end_date: null,
                description: null,
                total_hours: 0,
                billable_hours: 0,
                non_billable_hours: 0,
                timelog_count: 0,
                employee_count: 0,
                budget_utilization: null,
                created_at: "",
                updated_at: "",
              } satisfies IHrmPlatformProject.ISummary,
              assignedEmployee: null,
              parentTask: null,
            } satisfies IHrmPlatformTask.ISummary)
          : null,
      } satisfies IHrmPlatformTimer.ISummary)
    : null;
  const recentTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      employee_id: employee.id,
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
    take: 5,
    include: {
      project: true,
      task: true,
      employee: {
        include: {
          member: true,
          role: {
            include: {
              organization: {
                include: { owner: true },
              },
            },
          },
          department: {
            include: {
              parentDepartment: {
                include: {
                  organization: {
                    include: { owner: true },
                  },
                },
              },
              organization: {
                include: { owner: true },
              },
            },
          },
          organization: {
            include: { owner: true },
          },
        },
      },
    },
  });
  const pendingTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
        start_date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        employee: {
          include: {
            member: true,
            role: {
              include: {
                organization: {
                  include: { owner: true },
                },
              },
            },
            department: {
              include: {
                parentDepartment: {
                  include: {
                    organization: {
                      include: { owner: true },
                    },
                  },
                },
                organization: {
                  include: { owner: true },
                },
              },
            },
            organization: {
              include: { owner: true },
            },
          },
        },
        timelogs: true,
      },
    });
  const assignedTasks = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: {
      assigned_employee_id: employee.id,
      status: {
        in: ["TODO", "IN_PROGRESS"],
      },
      deleted_at: null,
    },
    include: {
      project: true,
      assignedEmployee: {
        include: {
          member: true,
          role: {
            include: {
              organization: {
                include: { owner: true },
              },
            },
          },
          department: {
            include: {
              parentDepartment: {
                include: {
                  organization: {
                    include: { owner: true },
                  },
                },
              },
              organization: {
                include: { owner: true },
              },
            },
          },
          organization: {
            include: { owner: true },
          },
        },
      },
    },
  });
  const transformTimelogSummary = (
    tl: (typeof recentTimelogs)[0],
  ): IHrmPlatformTimelog.ISummary => ({
    id: tl.id,
    start_datetime: toISOStringSafe(tl.start_datetime),
    end_datetime: toISOStringSafe(tl.end_datetime),
    duration_minutes: tl.duration_minutes,
    billable: tl.billable,
    description: tl.description ?? null,
    employee: {
      id: tl.employee.id,
      employee_code: tl.employee.employee_code,
      display_name: tl.employee.display_name,
      email: tl.employee.email,
      phone_number: tl.employee.phone_number ?? null,
      job_title: tl.employee.job_title ?? null,
      job_level: tl.employee.job_level,
      employment_type: tl.employee.employment_type,
      status: tl.employee.status,
      start_date: toISOStringSafe(tl.employee.start_date),
      end_date: tl.employee.end_date
        ? toISOStringSafe(tl.employee.end_date)
        : null,
      is_pending: tl.employee.is_pending,
      created_at: toISOStringSafe(tl.employee.created_at),
      updated_at: toISOStringSafe(tl.employee.updated_at),
      deleted_at: tl.employee.deleted_at
        ? toISOStringSafe(tl.employee.deleted_at)
        : null,
      member: {
        id: tl.employee.member.id,
        email: tl.employee.member.email,
        display_name: tl.employee.member.display_name ?? undefined,
        avatar_uri: tl.employee.member.avatar_uri ?? undefined,
        phone_number: tl.employee.member.phone_number ?? undefined,
        is_active: tl.employee.member.is_active,
        last_login_at: tl.employee.member.last_login_at
          ? toISOStringSafe(tl.employee.member.last_login_at)
          : null,
        created_at: toISOStringSafe(tl.employee.member.created_at),
        updated_at: toISOStringSafe(tl.employee.member.updated_at),
        deleted_at: tl.employee.member.deleted_at
          ? toISOStringSafe(tl.employee.member.deleted_at)
          : null,
      } satisfies IHrmPlatformMember.ISummary,
      role: {
        id: tl.employee.role.id,
        name: tl.employee.role.name,
        role_kind: tl.employee.role.role_kind,
        permissions_count: 0,
        organization: {
          id: tl.employee.role.organization.id,
          name: tl.employee.role.organization.name,
          description: tl.employee.role.organization.description ?? null,
          currency: tl.employee.role.organization.currency,
          timezone: tl.employee.role.organization.timezone,
          fiscal_start_month: tl.employee.role.organization.fiscal_start_month,
          created_at: toISOStringSafe(tl.employee.role.organization.created_at),
          updated_at: toISOStringSafe(tl.employee.role.organization.updated_at),
          deleted_at: tl.employee.role.organization.deleted_at
            ? toISOStringSafe(tl.employee.role.organization.deleted_at)
            : null,
          owner: {
            id: tl.employee.role.organization.owner.id,
            email: tl.employee.role.organization.owner.email,
            display_name:
              tl.employee.role.organization.owner.display_name ?? undefined,
            avatar_uri:
              tl.employee.role.organization.owner.avatar_uri ?? undefined,
            phone_number:
              tl.employee.role.organization.owner.phone_number ?? undefined,
            is_active: tl.employee.role.organization.owner.is_active,
            last_login_at: tl.employee.role.organization.owner.last_login_at
              ? toISOStringSafe(
                  tl.employee.role.organization.owner.last_login_at,
                )
              : null,
            created_at: toISOStringSafe(
              tl.employee.role.organization.owner.created_at,
            ),
            updated_at: toISOStringSafe(
              tl.employee.role.organization.owner.updated_at,
            ),
            deleted_at: tl.employee.role.organization.owner.deleted_at
              ? toISOStringSafe(tl.employee.role.organization.owner.deleted_at)
              : null,
          } satisfies IHrmPlatformMember.ISummary,
        } satisfies IHrmPlatformOrganization.ISummary,
      } satisfies IHrmPlatformRole.ISummary,
      department: tl.employee.department
        ? ({
            id: tl.employee.department.id,
            name: tl.employee.department.name,
            parentDepartment: tl.employee.department.parentDepartment
              ? ({
                  id: tl.employee.department.parentDepartment.id,
                  name: tl.employee.department.parentDepartment.name,
                  created_at: toISOStringSafe(
                    tl.employee.department.parentDepartment.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    tl.employee.department.parentDepartment.updated_at,
                  ),
                  organization: {
                    id: tl.employee.department.parentDepartment.organization.id,
                    name: tl.employee.department.parentDepartment.organization
                      .name,
                    description:
                      tl.employee.department.parentDepartment.organization
                        .description ?? null,
                    currency:
                      tl.employee.department.parentDepartment.organization
                        .currency,
                    timezone:
                      tl.employee.department.parentDepartment.organization
                        .timezone,
                    fiscal_start_month:
                      tl.employee.department.parentDepartment.organization
                        .fiscal_start_month,
                    created_at: toISOStringSafe(
                      tl.employee.department.parentDepartment.organization
                        .created_at,
                    ),
                    updated_at: toISOStringSafe(
                      tl.employee.department.parentDepartment.organization
                        .updated_at,
                    ),
                    deleted_at: tl.employee.department.parentDepartment
                      .organization.deleted_at
                      ? toISOStringSafe(
                          tl.employee.department.parentDepartment.organization
                            .deleted_at,
                        )
                      : null,
                    owner: {
                      id: tl.employee.department.parentDepartment.organization
                        .owner.id,
                      email:
                        tl.employee.department.parentDepartment.organization
                          .owner.email,
                      display_name:
                        tl.employee.department.parentDepartment.organization
                          .owner.display_name ?? undefined,
                      avatar_uri:
                        tl.employee.department.parentDepartment.organization
                          .owner.avatar_uri ?? undefined,
                      phone_number:
                        tl.employee.department.parentDepartment.organization
                          .owner.phone_number ?? undefined,
                      is_active:
                        tl.employee.department.parentDepartment.organization
                          .owner.is_active,
                      last_login_at: tl.employee.department.parentDepartment
                        .organization.owner.last_login_at
                        ? toISOStringSafe(
                            tl.employee.department.parentDepartment.organization
                              .owner.last_login_at,
                          )
                        : null,
                      created_at: toISOStringSafe(
                        tl.employee.department.parentDepartment.organization
                          .owner.created_at,
                      ),
                      updated_at: toISOStringSafe(
                        tl.employee.department.parentDepartment.organization
                          .owner.updated_at,
                      ),
                      deleted_at: tl.employee.department.parentDepartment
                        .organization.owner.deleted_at
                        ? toISOStringSafe(
                            tl.employee.department.parentDepartment.organization
                              .owner.deleted_at,
                          )
                        : null,
                    } satisfies IHrmPlatformMember.ISummary,
                  } satisfies IHrmPlatformOrganization.ISummary,
                  parentDepartment: null,
                } satisfies IHrmPlatformDepartment.ISummary)
              : null,
            organization: {
              id: tl.employee.department.organization.id,
              name: tl.employee.department.organization.name,
              description:
                tl.employee.department.organization.description ?? null,
              currency: tl.employee.department.organization.currency,
              timezone: tl.employee.department.organization.timezone,
              fiscal_start_month:
                tl.employee.department.organization.fiscal_start_month,
              created_at: toISOStringSafe(
                tl.employee.department.organization.created_at,
              ),
              updated_at: toISOStringSafe(
                tl.employee.department.organization.updated_at,
              ),
              deleted_at: tl.employee.department.organization.deleted_at
                ? toISOStringSafe(
                    tl.employee.department.organization.deleted_at,
                  )
                : null,
              owner: {
                id: tl.employee.department.organization.owner.id,
                email: tl.employee.department.organization.owner.email,
                display_name:
                  tl.employee.department.organization.owner.display_name ??
                  undefined,
                avatar_uri:
                  tl.employee.department.organization.owner.avatar_uri ??
                  undefined,
                phone_number:
                  tl.employee.department.organization.owner.phone_number ??
                  undefined,
                is_active: tl.employee.department.organization.owner.is_active,
                last_login_at: tl.employee.department.organization.owner
                  .last_login_at
                  ? toISOStringSafe(
                      tl.employee.department.organization.owner.last_login_at,
                    )
                  : null,
                created_at: toISOStringSafe(
                  tl.employee.department.organization.owner.created_at,
                ),
                updated_at: toISOStringSafe(
                  tl.employee.department.organization.owner.updated_at,
                ),
                deleted_at: tl.employee.department.organization.owner.deleted_at
                  ? toISOStringSafe(
                      tl.employee.department.organization.owner.deleted_at,
                    )
                  : null,
              } satisfies IHrmPlatformMember.ISummary,
            } satisfies IHrmPlatformOrganization.ISummary,
            created_at: toISOStringSafe(tl.employee.department.created_at),
            updated_at: toISOStringSafe(tl.employee.department.updated_at),
          } satisfies IHrmPlatformDepartment.ISummary)
        : null,
      organization: {
        id: tl.employee.organization.id,
        name: tl.employee.organization.name,
        description: tl.employee.organization.description ?? null,
        currency: tl.employee.organization.currency,
        timezone: tl.employee.organization.timezone,
        fiscal_start_month: tl.employee.organization.fiscal_start_month,
        created_at: toISOStringSafe(tl.employee.organization.created_at),
        updated_at: toISOStringSafe(tl.employee.organization.updated_at),
        deleted_at: tl.employee.organization.deleted_at
          ? toISOStringSafe(tl.employee.organization.deleted_at)
          : null,
        owner: {
          id: tl.employee.organization.owner.id,
          email: tl.employee.organization.owner.email,
          display_name:
            tl.employee.organization.owner.display_name ?? undefined,
          avatar_uri: tl.employee.organization.owner.avatar_uri ?? undefined,
          phone_number:
            tl.employee.organization.owner.phone_number ?? undefined,
          is_active: tl.employee.organization.owner.is_active,
          last_login_at: tl.employee.organization.owner.last_login_at
            ? toISOStringSafe(tl.employee.organization.owner.last_login_at)
            : null,
          created_at: toISOStringSafe(
            tl.employee.organization.owner.created_at,
          ),
          updated_at: toISOStringSafe(
            tl.employee.organization.owner.updated_at,
          ),
          deleted_at: tl.employee.organization.owner.deleted_at
            ? toISOStringSafe(tl.employee.organization.owner.deleted_at)
            : null,
        } satisfies IHrmPlatformMember.ISummary,
      } satisfies IHrmPlatformOrganization.ISummary,
    } satisfies IHrmPlatformEmployee.ISummary,
    project: {
      id: tl.project.id,
      name: tl.project.name,
      status: tl.project.status,
      color_code: tl.project.color_code,
      budget_hours: tl.project.budget_hours,
      start_date: tl.project.start_date
        ? toISOStringSafe(tl.project.start_date)
        : null,
      end_date: tl.project.end_date
        ? toISOStringSafe(tl.project.end_date)
        : null,
      description: tl.project.description ?? null,
      total_hours: 0,
      billable_hours: 0,
      non_billable_hours: 0,
      timelog_count: 0,
      employee_count: 0,
      budget_utilization: null,
      created_at: toISOStringSafe(tl.project.created_at),
      updated_at: toISOStringSafe(tl.project.updated_at),
    } satisfies IHrmPlatformProject.ISummary,
    task: tl.task
      ? ({
          id: tl.task.id,
          title: tl.task.title,
          status: tl.task.status,
          priority: tl.task.priority,
          created_at: toISOStringSafe(tl.task.created_at),
          due_date: tl.task.due_date ? toISOStringSafe(tl.task.due_date) : null,
          project: {
            id: tl.task.project_id,
            name: "",
            status: "",
            color_code: "",
            budget_hours: null,
            start_date: null,
            end_date: null,
            description: null,
            total_hours: 0,
            billable_hours: 0,
            non_billable_hours: 0,
            timelog_count: 0,
            employee_count: 0,
            budget_utilization: null,
            created_at: "",
            updated_at: "",
          } satisfies IHrmPlatformProject.ISummary,
          assignedEmployee: null,
          parentTask: null,
        } satisfies IHrmPlatformTask.ISummary)
      : null,
  });
  const transformTimesheetSummary = (
    ts: Prisma.hrm_platform_timesheetsGetPayload<{
      include: {
        employee: {
          include: {
            member: true;
            role: {
              include: {
                organization: {
                  include: {
                    owner: true;
                  };
                };
              };
            };
            department: {
              include: {
                parentDepartment: {
                  include: {
                    organization: {
                      include: {
                        owner: true;
                      };
                    };
                  };
                };
                organization: {
                  include: {
                    owner: true;
                  };
                };
              };
            };
            organization: {
              include: {
                owner: true;
              };
            };
          };
        };
        timelogs: true;
      };
    }>,
  ): IHrmPlatformTimesheet.ISummary =>
    ({
      id: ts.id,
      start_date: toISOStringSafe(ts.start_date),
      end_date: toISOStringSafe(ts.end_date),
      status: ts.status as
        | "pending"
        | "submitted"
        | "approved"
        | "rejected"
        | "cancelled",
      notes: ts.notes ?? null,
      total_hours: ts.total_hours,
      employee: {
        id: ts.employee.id,
        employee_code: ts.employee.employee_code,
        display_name: ts.employee.display_name,
        email: ts.employee.email,
        phone_number: ts.employee.phone_number ?? null,
        job_title: ts.employee.job_title ?? null,
        job_level: ts.employee.job_level,
        employment_type: ts.employee.employment_type,
        status: ts.employee.status,
        start_date: toISOStringSafe(ts.employee.start_date),
        end_date: ts.employee.end_date
          ? toISOStringSafe(ts.employee.end_date)
          : null,
        is_pending: ts.employee.is_pending,
        created_at: toISOStringSafe(ts.employee.created_at),
        updated_at: toISOStringSafe(ts.employee.updated_at),
        deleted_at: ts.employee.deleted_at
          ? toISOStringSafe(ts.employee.deleted_at)
          : null,
        member: {
          id: ts.employee.member.id,
          email: ts.employee.member.email,
          display_name: ts.employee.member.display_name ?? undefined,
          avatar_uri: ts.employee.member.avatar_uri ?? undefined,
          phone_number: ts.employee.member.phone_number ?? undefined,
          is_active: ts.employee.member.is_active,
          last_login_at: ts.employee.member.last_login_at
            ? toISOStringSafe(ts.employee.member.last_login_at)
            : null,
          created_at: toISOStringSafe(ts.employee.member.created_at),
          updated_at: toISOStringSafe(ts.employee.member.updated_at),
          deleted_at: ts.employee.member.deleted_at
            ? toISOStringSafe(ts.employee.member.deleted_at)
            : null,
        } satisfies IHrmPlatformMember.ISummary,
        role: {
          id: ts.employee.role.id,
          name: ts.employee.role.name,
          role_kind: ts.employee.role.role_kind,
          permissions_count: 0,
          organization: {
            id: ts.employee.role.organization.id,
            name: ts.employee.role.organization.name,
            description: ts.employee.role.organization.description ?? null,
            currency: ts.employee.role.organization.currency,
            timezone: ts.employee.role.organization.timezone,
            fiscal_start_month:
              ts.employee.role.organization.fiscal_start_month,
            created_at: toISOStringSafe(
              ts.employee.role.organization.created_at,
            ),
            updated_at: toISOStringSafe(
              ts.employee.role.organization.updated_at,
            ),
            deleted_at: ts.employee.role.organization.deleted_at
              ? toISOStringSafe(ts.employee.role.organization.deleted_at)
              : null,
            owner: {
              id: ts.employee.role.organization.owner.id,
              email: ts.employee.role.organization.owner.email,
              display_name:
                ts.employee.role.organization.owner.display_name ?? undefined,
              avatar_uri:
                ts.employee.role.organization.owner.avatar_uri ?? undefined,
              phone_number:
                ts.employee.role.organization.owner.phone_number ?? undefined,
              is_active: ts.employee.role.organization.owner.is_active,
              last_login_at: ts.employee.role.organization.owner.last_login_at
                ? toISOStringSafe(
                    ts.employee.role.organization.owner.last_login_at,
                  )
                : null,
              created_at: toISOStringSafe(
                ts.employee.role.organization.owner.created_at,
              ),
              updated_at: toISOStringSafe(
                ts.employee.role.organization.owner.updated_at,
              ),
              deleted_at: ts.employee.role.organization.owner.deleted_at
                ? toISOStringSafe(
                    ts.employee.role.organization.owner.deleted_at,
                  )
                : null,
            } satisfies IHrmPlatformMember.ISummary,
          } satisfies IHrmPlatformOrganization.ISummary,
        } satisfies IHrmPlatformRole.ISummary,
        department: ts.employee.department
          ? ({
              id: ts.employee.department.id,
              name: ts.employee.department.name,
              parentDepartment: ts.employee.department.parentDepartment
                ? ({
                    id: ts.employee.department.parentDepartment.id,
                    name: ts.employee.department.parentDepartment.name,
                    created_at: toISOStringSafe(
                      ts.employee.department.parentDepartment.created_at,
                    ),
                    updated_at: toISOStringSafe(
                      ts.employee.department.parentDepartment.updated_at,
                    ),
                    organization: {
                      id: ts.employee.department.parentDepartment.organization
                        .id,
                      name: ts.employee.department.parentDepartment.organization
                        .name,
                      description:
                        ts.employee.department.parentDepartment.organization
                          .description ?? null,
                      currency:
                        ts.employee.department.parentDepartment.organization
                          .currency,
                      timezone:
                        ts.employee.department.parentDepartment.organization
                          .timezone,
                      fiscal_start_month:
                        ts.employee.department.parentDepartment.organization
                          .fiscal_start_month,
                      created_at: toISOStringSafe(
                        ts.employee.department.parentDepartment.organization
                          .created_at,
                      ),
                      updated_at: toISOStringSafe(
                        ts.employee.department.parentDepartment.organization
                          .updated_at,
                      ),
                      deleted_at: ts.employee.department.parentDepartment
                        .organization.deleted_at
                        ? toISOStringSafe(
                            ts.employee.department.parentDepartment.organization
                              .deleted_at,
                          )
                        : null,
                      owner: {
                        id: ts.employee.department.parentDepartment.organization
                          .owner.id,
                        email:
                          ts.employee.department.parentDepartment.organization
                            .owner.email,
                        display_name:
                          ts.employee.department.parentDepartment.organization
                            .owner.display_name ?? undefined,
                        avatar_uri:
                          ts.employee.department.parentDepartment.organization
                            .owner.avatar_uri ?? undefined,
                        phone_number:
                          ts.employee.department.parentDepartment.organization
                            .owner.phone_number ?? undefined,
                        is_active:
                          ts.employee.department.parentDepartment.organization
                            .owner.is_active,
                        last_login_at: ts.employee.department.parentDepartment
                          .organization.owner.last_login_at
                          ? toISOStringSafe(
                              ts.employee.department.parentDepartment
                                .organization.owner.last_login_at,
                            )
                          : null,
                        created_at: toISOStringSafe(
                          ts.employee.department.parentDepartment.organization
                            .owner.created_at,
                        ),
                        updated_at: toISOStringSafe(
                          ts.employee.department.parentDepartment.organization
                            .owner.updated_at,
                        ),
                        deleted_at: ts.employee.department.parentDepartment
                          .organization.owner.deleted_at
                          ? toISOStringSafe(
                              ts.employee.department.parentDepartment
                                .organization.owner.deleted_at,
                            )
                          : null,
                      } satisfies IHrmPlatformMember.ISummary,
                    } satisfies IHrmPlatformOrganization.ISummary,
                    parentDepartment: null,
                  } satisfies IHrmPlatformDepartment.ISummary)
                : null,
              organization: {
                id: ts.employee.department.organization.id,
                name: ts.employee.department.organization.name,
                description:
                  ts.employee.department.organization.description ?? null,
                currency: ts.employee.department.organization.currency,
                timezone: ts.employee.department.organization.timezone,
                fiscal_start_month:
                  ts.employee.department.organization.fiscal_start_month,
                created_at: toISOStringSafe(
                  ts.employee.department.organization.created_at,
                ),
                updated_at: toISOStringSafe(
                  ts.employee.department.organization.updated_at,
                ),
                deleted_at: ts.employee.department.organization.deleted_at
                  ? toISOStringSafe(
                      ts.employee.department.organization.deleted_at,
                    )
                  : null,
                owner: {
                  id: ts.employee.department.organization.owner.id,
                  email: ts.employee.department.organization.owner.email,
                  display_name:
                    ts.employee.department.organization.owner.display_name ??
                    undefined,
                  avatar_uri:
                    ts.employee.department.organization.owner.avatar_uri ??
                    undefined,
                  phone_number:
                    ts.employee.department.organization.owner.phone_number ??
                    undefined,
                  is_active:
                    ts.employee.department.organization.owner.is_active,
                  last_login_at: ts.employee.department.organization.owner
                    .last_login_at
                    ? toISOStringSafe(
                        ts.employee.department.organization.owner.last_login_at,
                      )
                    : null,
                  created_at: toISOStringSafe(
                    ts.employee.department.organization.owner.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    ts.employee.department.organization.owner.updated_at,
                  ),
                  deleted_at: ts.employee.department.organization.owner
                    .deleted_at
                    ? toISOStringSafe(
                        ts.employee.department.organization.owner.deleted_at,
                      )
                    : null,
                } satisfies IHrmPlatformMember.ISummary,
              } satisfies IHrmPlatformOrganization.ISummary,
              created_at: toISOStringSafe(ts.employee.department.created_at),
              updated_at: toISOStringSafe(ts.employee.department.updated_at),
            } satisfies IHrmPlatformDepartment.ISummary)
          : null,
        organization: {
          id: ts.employee.organization.id,
          name: ts.employee.organization.name,
          description: ts.employee.organization.description ?? null,
          currency: ts.employee.organization.currency,
          timezone: ts.employee.organization.timezone,
          fiscal_start_month: ts.employee.organization.fiscal_start_month,
          created_at: toISOStringSafe(ts.employee.organization.created_at),
          updated_at: toISOStringSafe(ts.employee.organization.updated_at),
          deleted_at: ts.employee.organization.deleted_at
            ? toISOStringSafe(ts.employee.organization.deleted_at)
            : null,
          owner: {
            id: ts.employee.organization.owner.id,
            email: ts.employee.organization.owner.email,
            display_name:
              ts.employee.organization.owner.display_name ?? undefined,
            avatar_uri: ts.employee.organization.owner.avatar_uri ?? undefined,
            phone_number:
              ts.employee.organization.owner.phone_number ?? undefined,
            is_active: ts.employee.organization.owner.is_active,
            last_login_at: ts.employee.organization.owner.last_login_at
              ? toISOStringSafe(ts.employee.organization.owner.last_login_at)
              : null,
            created_at: toISOStringSafe(
              ts.employee.organization.owner.created_at,
            ),
            updated_at: toISOStringSafe(
              ts.employee.organization.owner.updated_at,
            ),
            deleted_at: ts.employee.organization.owner.deleted_at
              ? toISOStringSafe(ts.employee.organization.owner.deleted_at)
              : null,
          } satisfies IHrmPlatformMember.ISummary,
        } satisfies IHrmPlatformOrganization.ISummary,
      } satisfies IHrmPlatformEmployee.ISummary,
      created_at: toISOStringSafe(ts.created_at),
      updated_at: toISOStringSafe(ts.updated_at),
      deleted_at: ts.deleted_at ? toISOStringSafe(ts.deleted_at) : null,
    }) satisfies IHrmPlatformTimesheet.ISummary;
  const transformTaskSummary = (
    t: (typeof assignedTasks)[0],
  ): IHrmPlatformTask.ISummary =>
    ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      created_at: toISOStringSafe(t.created_at),
      due_date: t.due_date ? toISOStringSafe(t.due_date) : null,
      project: {
        id: t.project.id,
        name: t.project.name,
        status: t.project.status,
        color_code: t.project.color_code,
        budget_hours: t.project.budget_hours,
        start_date: t.project.start_date
          ? toISOStringSafe(t.project.start_date)
          : null,
        end_date: t.project.end_date
          ? toISOStringSafe(t.project.end_date)
          : null,
        description: t.project.description ?? null,
        total_hours: 0,
        billable_hours: 0,
        non_billable_hours: 0,
        timelog_count: 0,
        employee_count: 0,
        budget_utilization: null,
        created_at: toISOStringSafe(t.project.created_at),
        updated_at: toISOStringSafe(t.project.updated_at),
      } satisfies IHrmPlatformProject.ISummary,
      assignedEmployee: t.assignedEmployee
        ? ({
            id: t.assignedEmployee.id,
            employee_code: t.assignedEmployee.employee_code,
            display_name: t.assignedEmployee.display_name,
            email: t.assignedEmployee.email,
            phone_number: t.assignedEmployee.phone_number ?? null,
            job_title: t.assignedEmployee.job_title ?? null,
            job_level: t.assignedEmployee.job_level,
            employment_type: t.assignedEmployee.employment_type,
            status: t.assignedEmployee.status,
            start_date: toISOStringSafe(t.assignedEmployee.start_date),
            end_date: t.assignedEmployee.end_date
              ? toISOStringSafe(t.assignedEmployee.end_date)
              : null,
            is_pending: t.assignedEmployee.is_pending,
            created_at: toISOStringSafe(t.assignedEmployee.created_at),
            updated_at: toISOStringSafe(t.assignedEmployee.updated_at),
            deleted_at: t.assignedEmployee.deleted_at
              ? toISOStringSafe(t.assignedEmployee.deleted_at)
              : null,
            member: {
              id: t.assignedEmployee.member.id,
              email: t.assignedEmployee.member.email,
              display_name: t.assignedEmployee.member.display_name ?? undefined,
              avatar_uri: t.assignedEmployee.member.avatar_uri ?? undefined,
              phone_number: t.assignedEmployee.member.phone_number ?? undefined,
              is_active: t.assignedEmployee.member.is_active,
              last_login_at: t.assignedEmployee.member.last_login_at
                ? toISOStringSafe(t.assignedEmployee.member.last_login_at)
                : null,
              created_at: toISOStringSafe(t.assignedEmployee.member.created_at),
              updated_at: toISOStringSafe(t.assignedEmployee.member.updated_at),
              deleted_at: t.assignedEmployee.member.deleted_at
                ? toISOStringSafe(t.assignedEmployee.member.deleted_at)
                : null,
            } satisfies IHrmPlatformMember.ISummary,
            role: {
              id: t.assignedEmployee.role.id,
              name: t.assignedEmployee.role.name,
              role_kind: t.assignedEmployee.role.role_kind,
              permissions_count: 0,
              organization: {
                id: t.assignedEmployee.role.organization.id,
                name: t.assignedEmployee.role.organization.name,
                description:
                  t.assignedEmployee.role.organization.description ?? null,
                currency: t.assignedEmployee.role.organization.currency,
                timezone: t.assignedEmployee.role.organization.timezone,
                fiscal_start_month:
                  t.assignedEmployee.role.organization.fiscal_start_month,
                created_at: toISOStringSafe(
                  t.assignedEmployee.role.organization.created_at,
                ),
                updated_at: toISOStringSafe(
                  t.assignedEmployee.role.organization.updated_at,
                ),
                deleted_at: t.assignedEmployee.role.organization.deleted_at
                  ? toISOStringSafe(
                      t.assignedEmployee.role.organization.deleted_at,
                    )
                  : null,
                owner: {
                  id: t.assignedEmployee.role.organization.owner.id,
                  email: t.assignedEmployee.role.organization.owner.email,
                  display_name:
                    t.assignedEmployee.role.organization.owner.display_name ??
                    undefined,
                  avatar_uri:
                    t.assignedEmployee.role.organization.owner.avatar_uri ??
                    undefined,
                  phone_number:
                    t.assignedEmployee.role.organization.owner.phone_number ??
                    undefined,
                  is_active:
                    t.assignedEmployee.role.organization.owner.is_active,
                  last_login_at: t.assignedEmployee.role.organization.owner
                    .last_login_at
                    ? toISOStringSafe(
                        t.assignedEmployee.role.organization.owner
                          .last_login_at,
                      )
                    : null,
                  created_at: toISOStringSafe(
                    t.assignedEmployee.role.organization.owner.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    t.assignedEmployee.role.organization.owner.updated_at,
                  ),
                  deleted_at: t.assignedEmployee.role.organization.owner
                    .deleted_at
                    ? toISOStringSafe(
                        t.assignedEmployee.role.organization.owner.deleted_at,
                      )
                    : null,
                } satisfies IHrmPlatformMember.ISummary,
              } satisfies IHrmPlatformOrganization.ISummary,
            } satisfies IHrmPlatformRole.ISummary,
            department: t.assignedEmployee.department
              ? ({
                  id: t.assignedEmployee.department.id,
                  name: t.assignedEmployee.department.name,
                  parentDepartment: t.assignedEmployee.department
                    .parentDepartment
                    ? ({
                        id: t.assignedEmployee.department.parentDepartment.id,
                        name: t.assignedEmployee.department.parentDepartment
                          .name,
                        created_at: toISOStringSafe(
                          t.assignedEmployee.department.parentDepartment
                            .created_at,
                        ),
                        updated_at: toISOStringSafe(
                          t.assignedEmployee.department.parentDepartment
                            .updated_at,
                        ),
                        organization: {
                          id: t.assignedEmployee.department.parentDepartment
                            .organization.id,
                          name: t.assignedEmployee.department.parentDepartment
                            .organization.name,
                          description:
                            t.assignedEmployee.department.parentDepartment
                              .organization.description ?? null,
                          currency:
                            t.assignedEmployee.department.parentDepartment
                              .organization.currency,
                          timezone:
                            t.assignedEmployee.department.parentDepartment
                              .organization.timezone,
                          fiscal_start_month:
                            t.assignedEmployee.department.parentDepartment
                              .organization.fiscal_start_month,
                          created_at: toISOStringSafe(
                            t.assignedEmployee.department.parentDepartment
                              .organization.created_at,
                          ),
                          updated_at: toISOStringSafe(
                            t.assignedEmployee.department.parentDepartment
                              .organization.updated_at,
                          ),
                          deleted_at: t.assignedEmployee.department
                            .parentDepartment.organization.deleted_at
                            ? toISOStringSafe(
                                t.assignedEmployee.department.parentDepartment
                                  .organization.deleted_at,
                              )
                            : null,
                          owner: {
                            id: t.assignedEmployee.department.parentDepartment
                              .organization.owner.id,
                            email:
                              t.assignedEmployee.department.parentDepartment
                                .organization.owner.email,
                            display_name:
                              t.assignedEmployee.department.parentDepartment
                                .organization.owner.display_name ?? undefined,
                            avatar_uri:
                              t.assignedEmployee.department.parentDepartment
                                .organization.owner.avatar_uri ?? undefined,
                            phone_number:
                              t.assignedEmployee.department.parentDepartment
                                .organization.owner.phone_number ?? undefined,
                            is_active:
                              t.assignedEmployee.department.parentDepartment
                                .organization.owner.is_active,
                            last_login_at: t.assignedEmployee.department
                              .parentDepartment.organization.owner.last_login_at
                              ? toISOStringSafe(
                                  t.assignedEmployee.department.parentDepartment
                                    .organization.owner.last_login_at,
                                )
                              : null,
                            created_at: toISOStringSafe(
                              t.assignedEmployee.department.parentDepartment
                                .organization.owner.created_at,
                            ),
                            updated_at: toISOStringSafe(
                              t.assignedEmployee.department.parentDepartment
                                .organization.owner.updated_at,
                            ),
                            deleted_at: t.assignedEmployee.department
                              .parentDepartment.organization.owner.deleted_at
                              ? toISOStringSafe(
                                  t.assignedEmployee.department.parentDepartment
                                    .organization.owner.deleted_at,
                                )
                              : null,
                          } satisfies IHrmPlatformMember.ISummary,
                        } satisfies IHrmPlatformOrganization.ISummary,
                        parentDepartment: null,
                      } satisfies IHrmPlatformDepartment.ISummary)
                    : null,
                  organization: {
                    id: t.assignedEmployee.department.organization.id,
                    name: t.assignedEmployee.department.organization.name,
                    description:
                      t.assignedEmployee.department.organization.description ??
                      null,
                    currency:
                      t.assignedEmployee.department.organization.currency,
                    timezone:
                      t.assignedEmployee.department.organization.timezone,
                    fiscal_start_month:
                      t.assignedEmployee.department.organization
                        .fiscal_start_month,
                    created_at: toISOStringSafe(
                      t.assignedEmployee.department.organization.created_at,
                    ),
                    updated_at: toISOStringSafe(
                      t.assignedEmployee.department.organization.updated_at,
                    ),
                    deleted_at: t.assignedEmployee.department.organization
                      .deleted_at
                      ? toISOStringSafe(
                          t.assignedEmployee.department.organization.deleted_at,
                        )
                      : null,
                    owner: {
                      id: t.assignedEmployee.department.organization.owner.id,
                      email:
                        t.assignedEmployee.department.organization.owner.email,
                      display_name:
                        t.assignedEmployee.department.organization.owner
                          .display_name ?? undefined,
                      avatar_uri:
                        t.assignedEmployee.department.organization.owner
                          .avatar_uri ?? undefined,
                      phone_number:
                        t.assignedEmployee.department.organization.owner
                          .phone_number ?? undefined,
                      is_active:
                        t.assignedEmployee.department.organization.owner
                          .is_active,
                      last_login_at: t.assignedEmployee.department.organization
                        .owner.last_login_at
                        ? toISOStringSafe(
                            t.assignedEmployee.department.organization.owner
                              .last_login_at,
                          )
                        : null,
                      created_at: toISOStringSafe(
                        t.assignedEmployee.department.organization.owner
                          .created_at,
                      ),
                      updated_at: toISOStringSafe(
                        t.assignedEmployee.department.organization.owner
                          .updated_at,
                      ),
                      deleted_at: t.assignedEmployee.department.organization
                        .owner.deleted_at
                        ? toISOStringSafe(
                            t.assignedEmployee.department.organization.owner
                              .deleted_at,
                          )
                        : null,
                    } satisfies IHrmPlatformMember.ISummary,
                  } satisfies IHrmPlatformOrganization.ISummary,
                  created_at: toISOStringSafe(
                    t.assignedEmployee.department.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    t.assignedEmployee.department.updated_at,
                  ),
                } satisfies IHrmPlatformDepartment.ISummary)
              : null,
            organization: {
              id: t.assignedEmployee.organization.id,
              name: t.assignedEmployee.organization.name,
              description: t.assignedEmployee.organization.description ?? null,
              currency: t.assignedEmployee.organization.currency,
              timezone: t.assignedEmployee.organization.timezone,
              fiscal_start_month:
                t.assignedEmployee.organization.fiscal_start_month,
              created_at: toISOStringSafe(
                t.assignedEmployee.organization.created_at,
              ),
              updated_at: toISOStringSafe(
                t.assignedEmployee.organization.updated_at,
              ),
              deleted_at: t.assignedEmployee.organization.deleted_at
                ? toISOStringSafe(t.assignedEmployee.organization.deleted_at)
                : null,
              owner: {
                id: t.assignedEmployee.organization.owner.id,
                email: t.assignedEmployee.organization.owner.email,
                display_name:
                  t.assignedEmployee.organization.owner.display_name ??
                  undefined,
                avatar_uri:
                  t.assignedEmployee.organization.owner.avatar_uri ?? undefined,
                phone_number:
                  t.assignedEmployee.organization.owner.phone_number ??
                  undefined,
                is_active: t.assignedEmployee.organization.owner.is_active,
                last_login_at: t.assignedEmployee.organization.owner
                  .last_login_at
                  ? toISOStringSafe(
                      t.assignedEmployee.organization.owner.last_login_at,
                    )
                  : null,
                created_at: toISOStringSafe(
                  t.assignedEmployee.organization.owner.created_at,
                ),
                updated_at: toISOStringSafe(
                  t.assignedEmployee.organization.owner.updated_at,
                ),
                deleted_at: t.assignedEmployee.organization.owner.deleted_at
                  ? toISOStringSafe(
                      t.assignedEmployee.organization.owner.deleted_at,
                    )
                  : null,
              } satisfies IHrmPlatformMember.ISummary,
            } satisfies IHrmPlatformOrganization.ISummary,
          } satisfies IHrmPlatformEmployee.ISummary)
        : null,
      parentTask: null,
    }) satisfies IHrmPlatformTask.ISummary;
  return {
    hoursLoggedToday,
    hoursLoggedThisWeek,
    activeTimer,
    recentTimelogs: recentTimelogs.map(transformTimelogSummary),
    pendingTimesheet: pendingTimesheet
      ? transformTimesheetSummary(pendingTimesheet)
      : null,
    assignedTasks: assignedTasks.map(transformTaskSummary),
  } satisfies IHrmPlatformDashboard;
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
// import { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
// import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberDashboard(props: {
//   member: MemberPayload;
// }): Promise<IHrmPlatformDashboard> {
//   return {
//     hoursLoggedToday: ...,
//     hoursLoggedThisWeek: ...,
//     activeTimer: await HrmPlatformTimerAtSummaryTransformer.transform(...),
//     recentTimelogs: await ArrayUtil.asyncMap(..., (r) => HrmPlatformTimelogAtSummaryTransformer.transform(r)),
//     pendingTimesheet: await HrmPlatformTimesheetAtSummaryTransformer.transform(...),
//     assignedTasks: await HrmPlatformTaskAtSummaryTransformer.transformAll(...),
//   };
// }
// ```
//--------------------------------------------------------------