import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPersonalDashboard";
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

export async function getHrmPlatformMemberDashboardPersonal(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformPersonalDashboard> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + sundayOffset);
  weekEnd.setHours(23, 59, 59, 999);
  const [
    hoursLoggedToday,
    hoursLoggedThisWeek,
    activeTimerRecord,
    recentTimelogsRecords,
    pendingTimesheetRecord,
    assignedTasksRecords,
  ] = await Promise.all([
    MyGlobal.prisma.hrm_platform_timelogs
      .groupBy({
        by: ["hrm_platform_employee_id"],
        where: {
          hrm_platform_employee_id: employee.id,
          date: { gte: todayStart },
          deleted_at: null,
        },
        _sum: { duration_minutes: true },
      })
      .then((rows) =>
        rows.length > 0 ? (rows[0]._sum.duration_minutes ?? 0) / 60 : 0,
      ),
    MyGlobal.prisma.hrm_platform_timelogs
      .groupBy({
        by: ["hrm_platform_employee_id"],
        where: {
          hrm_platform_employee_id: employee.id,
          date: { gte: weekStart, lte: weekEnd },
          deleted_at: null,
        },
        _sum: { duration_minutes: true },
      })
      .then((rows) =>
        rows.length > 0 ? (rows[0]._sum.duration_minutes ?? 0) / 60 : 0,
      ),
    MyGlobal.prisma.hrm_platform_timers.findFirst({
      where: { employee_id: employee.id, stopped_at: null, deleted_at: null },
      select: {
        id: true,
        employee_id: true,
        project_id: true,
        task_id: true,
        started_at: true,
        stopped_at: true,
        description: true,
        created_at: true,
        project: {
          select: {
            id: true,
            name: true,
            color_code: true,
            status: true,
            budget_hours: true,
            start_date: true,
            end_date: true,
            organization: { select: { id: true, name: true } },
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            estimated_hours: true,
            due_date: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            project: {
              select: {
                id: true,
                name: true,
                color_code: true,
                status: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                organization: { select: { id: true, name: true } },
              },
            },
            assignedEmployee: {
              select: {
                id: true,
                position: true,
                employment_type: true,
                status: true,
                created_at: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_image: true,
                    phone_number: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    is_builtin: true,
                    created_at: true,
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
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.hrm_platform_timelogs.findMany({
      where: {
        hrm_platform_employee_id: employee.id,
        date: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        deleted_at: null,
      },
      orderBy: { date: "desc" },
      take: 10,
      select: {
        id: true,
        date: true,
        duration_minutes: true,
        description: true,
        billable: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
          select: {
            id: true,
            position: true,
            employment_type: true,
            status: true,
            created_at: true,
            user: {
              select: {
                id: true,
                email: true,
                display_name: true,
                avatar_image: true,
                phone_number: true,
              },
            },
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                is_builtin: true,
                created_at: true,
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
                deleted_at: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            color_code: true,
            status: true,
            budget_hours: true,
            start_date: true,
            end_date: true,
            organization: { select: { id: true, name: true } },
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            estimated_hours: true,
            due_date: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            project: {
              select: {
                id: true,
                name: true,
                color_code: true,
                status: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                organization: { select: { id: true, name: true } },
              },
            },
            assignedEmployee: {
              select: {
                id: true,
                position: true,
                employment_type: true,
                status: true,
                created_at: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_image: true,
                    phone_number: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    is_builtin: true,
                    created_at: true,
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
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        status: { in: ["draft", "submitted"] },
        deleted_at: null,
      },
      orderBy: { week_start_date: "desc" },
      select: {
        id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        employee: {
          select: {
            id: true,
            position: true,
            employment_type: true,
            status: true,
            created_at: true,
            user: {
              select: {
                id: true,
                email: true,
                display_name: true,
                avatar_image: true,
                phone_number: true,
              },
            },
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                is_builtin: true,
                created_at: true,
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
                deleted_at: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_image: true,
            phone_number: true,
          },
        },
      },
    }),
    MyGlobal.prisma.hrm_platform_tasks.findMany({
      where: {
        hrm_platform_employees_id: employee.id,
        status: { notIn: ["completed", "closed"] },
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        project: {
          select: {
            id: true,
            name: true,
            color_code: true,
            status: true,
            budget_hours: true,
            start_date: true,
            end_date: true,
            organization: { select: { id: true, name: true } },
          },
        },
        assignedEmployee: {
          select: {
            id: true,
            position: true,
            employment_type: true,
            status: true,
            created_at: true,
            user: {
              select: {
                id: true,
                email: true,
                display_name: true,
                avatar_image: true,
                phone_number: true,
              },
            },
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                is_builtin: true,
                created_at: true,
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
                deleted_at: true,
              },
            },
          },
        },
        parent: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            estimated_hours: true,
            due_date: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            project: {
              select: {
                id: true,
                name: true,
                color_code: true,
                status: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                organization: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
  ]);
  const transformMember = (m: {
    id: string;
    email: string;
    display_name: string;
    avatar_image?: string | null;
    phone_number?: string | null;
  }): IHrmPlatformMember.ISummary =>
    ({
      id: m.id as string & tags.Format<"uuid">,
      email: m.email as string & tags.Format<"email">,
      display_name: m.display_name,
      avatar_image: m.avatar_image ?? null,
      phone_number: m.phone_number ?? null,
    }) satisfies IHrmPlatformMember.ISummary;
  const transformRole = (r: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    is_builtin: boolean;
    created_at: Date;
    deleted_at?: Date | null;
  }): IHrmPlatformRole.ISummary =>
    ({
      id: r.id as string & tags.Format<"uuid">,
      code: r.code,
      name: r.name,
      description: r.description ?? null,
      is_builtin: r.is_builtin,
      permissions: [],
      created_at: toISOStringSafe(r.created_at) as string &
        tags.Format<"date-time">,
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    }) satisfies IHrmPlatformRole.ISummary;
  const transformDepartment = (d: {
    id: string;
    name: string;
    description?: string | null;
    parent_department_id?: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date | null;
  }): IHrmPlatformDepartment.ISummary =>
    ({
      id: d.id as string & tags.Format<"uuid">,
      name: d.name,
      description: d.description ?? null,
      parent_department: d.parent_department_id
        ? transformDepartment({
            id: d.parent_department_id,
            name: "",
            description: null,
            parent_department_id: null,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          })
        : undefined,
      created_at: toISOStringSafe(d.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(d.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: d.deleted_at ? toISOStringSafe(d.deleted_at) : null,
    }) satisfies IHrmPlatformDepartment.ISummary;
  const transformEmployee = (e: {
    id: string;
    position?: string | null;
    employment_type: string;
    status: string;
    created_at: Date;
    user: {
      id: string;
      email: string;
      display_name: string;
      avatar_image?: string | null;
      phone_number?: string | null;
    };
    role: {
      id: string;
      code: string;
      name: string;
      description?: string | null;
      is_builtin: boolean;
      created_at: Date;
      deleted_at?: Date | null;
    };
    department?: {
      id: string;
      name: string;
      description?: string | null;
      parent_department_id?: string | null;
      created_at: Date;
      updated_at: Date;
      deleted_at?: Date | null;
    } | null;
  }): IHrmPlatformEmployee.ISummary =>
    ({
      id: e.id as string & tags.Format<"uuid">,
      position: e.position ?? null,
      employment_type: e.employment_type,
      status: e.status,
      user: transformMember(e.user),
      role: transformRole(e.role),
      department: e.department ? transformDepartment(e.department) : undefined,
      created_at: toISOStringSafe(e.created_at) as string &
        tags.Format<"date-time">,
    }) satisfies IHrmPlatformEmployee.ISummary;
  const transformOrganization = (o: {
    id: string;
    name: string;
    description?: string | null;
    logo_url?: string | null;
    currency: string;
    timezone: string;
    fiscal_start_month: number;
    created_at: Date;
    updated_at: Date;
  }): IHrmPlatformOrganization.ISummary =>
    ({
      id: o.id as string & tags.Format<"uuid">,
      name: o.name,
      description: o.description ?? null,
      logo_url: o.logo_url ?? null,
      currency: o.currency,
      timezone: o.timezone,
      fiscal_start_month: o.fiscal_start_month,
      created_at: toISOStringSafe(o.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(o.updated_at) as string &
        tags.Format<"date-time">,
    }) satisfies IHrmPlatformOrganization.ISummary;
  const transformProject = (p: {
    id: string;
    name: string;
    color_code: string;
    status: string;
    budget_hours?: number | null;
    start_date?: Date | null;
    end_date?: Date | null;
    organization: {
      id: string;
      name: string;
    };
  }): IHrmPlatformProject.ISummary =>
    ({
      id: p.id as string & tags.Format<"uuid">,
      name: p.name,
      color_code: p.color_code,
      status: p.status,
      budget_hours: p.budget_hours ?? null,
      start_date: p.start_date ? toISOStringSafe(p.start_date) : null,
      end_date: p.end_date ? toISOStringSafe(p.end_date) : null,
      organization: {
        id: p.organization.id as string & tags.Format<"uuid">,
        name: p.organization.name,
        description: null,
        logo_url: null,
        currency: "USD",
        timezone: "UTC",
        fiscal_start_month: 1,
        created_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
        updated_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
      } satisfies IHrmPlatformOrganization.ISummary,
      member_count: 0,
      created_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
      updated_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
    }) satisfies IHrmPlatformProject.ISummary;
  const transformTask = (t: {
    id: string;
    title: string;
    status: string;
    priority: string;
    estimated_hours?: number | null;
    due_date?: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date | null;
    project: {
      id: string;
      name: string;
      color_code: string;
      status: string;
      budget_hours?: number | null;
      start_date?: Date | null;
      end_date?: Date | null;
      organization: {
        id: string;
        name: string;
      };
    };
    assignedEmployee?: {
      id: string;
      position?: string | null;
      employment_type: string;
      status: string;
      created_at: Date;
      user: {
        id: string;
        email: string;
        display_name: string;
        avatar_image?: string | null;
        phone_number?: string | null;
      };
      role: {
        id: string;
        code: string;
        name: string;
        description?: string | null;
        is_builtin: boolean;
        created_at: Date;
        deleted_at?: Date | null;
      };
      department?: {
        id: string;
        name: string;
        description?: string | null;
        parent_department_id?: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at?: Date | null;
      };
    } | null;
    parent?: {
      id: string;
      title: string;
      status: string;
      priority: string;
      estimated_hours?: number | null;
      due_date?: Date | null;
      created_at: Date;
      updated_at: Date;
      deleted_at?: Date | null;
      project: {
        id: string;
        name: string;
        color_code: string;
        status: string;
        budget_hours?: number | null;
        start_date?: Date | null;
        end_date?: Date | null;
        organization: {
          id: string;
          name: string;
        };
      };
    } | null;
  }): IHrmPlatformTask.ISummary =>
    ({
      id: t.id as string & tags.Format<"uuid">,
      title: t.title,
      status: t.status,
      priority: t.priority,
      estimated_hours: t.estimated_hours ?? null,
      due_date: t.due_date ? toISOStringSafe(t.due_date) : null,
      created_at: toISOStringSafe(t.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(t.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: t.deleted_at ? toISOStringSafe(t.deleted_at) : null,
      project: transformProject(t.project),
      assignedEmployee: t.assignedEmployee
        ? transformEmployee(t.assignedEmployee)
        : undefined,
      parent: t.parent ? transformTask(t.parent) : undefined,
    }) satisfies IHrmPlatformTask.ISummary;
  const transformTimelog = (tl: {
    id: string;
    date: Date;
    duration_minutes: number;
    description?: string | null;
    billable: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date | null;
    employee: {
      id: string;
      position?: string | null;
      employment_type: string;
      status: string;
      created_at: Date;
      user: {
        id: string;
        email: string;
        display_name: string;
        avatar_image?: string | null;
        phone_number?: string | null;
      };
      role: {
        id: string;
        code: string;
        name: string;
        description?: string | null;
        is_builtin: boolean;
        created_at: Date;
        deleted_at?: Date | null;
      };
      department?: {
        id: string;
        name: string;
        description?: string | null;
        parent_department_id?: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at?: Date | null;
      };
    };
    project: {
      id: string;
      name: string;
      color_code: string;
      status: string;
      budget_hours?: number | null;
      start_date?: Date | null;
      end_date?: Date | null;
      organization: {
        id: string;
        name: string;
      };
    };
    task?: {
      id: string;
      title: string;
      status: string;
      priority: string;
      estimated_hours?: number | null;
      due_date?: Date | null;
      created_at: Date;
      updated_at: Date;
      deleted_at?: Date | null;
      project: {
        id: string;
        name: string;
        color_code: string;
        status: string;
        budget_hours?: number | null;
        start_date?: Date | null;
        end_date?: Date | null;
        organization: {
          id: string;
          name: string;
        };
      };
      assignedEmployee?: {
        id: string;
        position?: string | null;
        employment_type: string;
        status: string;
        created_at: Date;
        user: {
          id: string;
          email: string;
          display_name: string;
          avatar_image?: string | null;
          phone_number?: string | null;
        };
        role: {
          id: string;
          code: string;
          name: string;
          description?: string | null;
          is_builtin: boolean;
          created_at: Date;
          deleted_at?: Date | null;
        };
        department?: {
          id: string;
          name: string;
          description?: string | null;
          parent_department_id?: string | null;
          created_at: Date;
          updated_at: Date;
          deleted_at?: Date | null;
        };
      };
    } | null;
  }): IHrmPlatformTimelog.ISummary =>
    ({
      id: tl.id as string & tags.Format<"uuid">,
      date: toISOStringSafe(tl.date) as string & tags.Format<"date-time">,
      duration_minutes: tl.duration_minutes,
      description: tl.description ?? null,
      billable: tl.billable,
      employee: transformEmployee(tl.employee),
      project: transformProject(tl.project),
      task: tl.task ? transformTask(tl.task) : undefined,
      created_at: toISOStringSafe(tl.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(tl.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: tl.deleted_at ? toISOStringSafe(tl.deleted_at) : null,
    }) satisfies IHrmPlatformTimelog.ISummary;
  const activeTimer: IHrmPlatformTimer.ISummary | null = activeTimerRecord
    ? {
        id: activeTimerRecord.id as string & tags.Format<"uuid">,
        employee: activeTimerRecord.task?.assignedEmployee
          ? transformEmployee(activeTimerRecord.task.assignedEmployee)
          : ({
              id: activeTimerRecord.employee_id as string & tags.Format<"uuid">,
              position: null,
              employment_type: "full-time",
              status: "active",
              user: {
                id: "" as string & tags.Format<"uuid">,
                email: "",
                display_name: "",
                avatar_image: null,
                phone_number: null,
              } satisfies IHrmPlatformMember.ISummary,
              role: {
                id: "" as string & tags.Format<"uuid">,
                code: "",
                name: "",
                description: null,
                is_builtin: false,
                permissions: [],
                created_at: toISOStringSafe(now) as string &
                  tags.Format<"date-time">,
                deleted_at: null,
              } satisfies IHrmPlatformRole.ISummary,
              department: undefined,
              created_at: toISOStringSafe(now) as string &
                tags.Format<"date-time">,
            } satisfies IHrmPlatformEmployee.ISummary),
        project: transformProject(activeTimerRecord.project),
        task: activeTimerRecord.task
          ? transformTask(activeTimerRecord.task)
          : undefined,
        started_at: toISOStringSafe(activeTimerRecord.started_at) as string &
          tags.Format<"date-time">,
        stopped_at: activeTimerRecord.stopped_at
          ? toISOStringSafe(activeTimerRecord.stopped_at)
          : null,
        description: activeTimerRecord.description ?? null,
        duration_minutes: activeTimerRecord.stopped_at
          ? Math.round(
              (activeTimerRecord.stopped_at.getTime() -
                activeTimerRecord.started_at.getTime()) /
                60000,
            )
          : Math.round(
              (now.getTime() - activeTimerRecord.started_at.getTime()) / 60000,
            ),
        created_at: toISOStringSafe(activeTimerRecord.created_at) as string &
          tags.Format<"date-time">,
      }
    : null;
  const recentTimelogs: IHrmPlatformTimelog.ISummary[] =
    await ArrayUtil.asyncMap(recentTimelogsRecords, (tl) =>
      transformTimelog(tl),
    );
  const pendingTimesheet: IHrmPlatformTimesheet.ISummary | null =
    pendingTimesheetRecord
      ? {
          id: pendingTimesheetRecord.id as string & tags.Format<"uuid">,
          weekStartDate: toISOStringSafe(
            pendingTimesheetRecord.week_start_date,
          ) as string & tags.Format<"date-time">,
          weekEndDate: toISOStringSafe(
            pendingTimesheetRecord.week_end_date,
          ) as string & tags.Format<"date-time">,
          status: pendingTimesheetRecord.status,
          totalHours: 0,
          submittedAt: pendingTimesheetRecord.submitted_at
            ? toISOStringSafe(pendingTimesheetRecord.submitted_at)
            : null,
          reviewedAt: pendingTimesheetRecord.reviewed_at
            ? toISOStringSafe(pendingTimesheetRecord.reviewed_at)
            : null,
          employee: transformEmployee(pendingTimesheetRecord.employee),
          reviewer: pendingTimesheetRecord.reviewer
            ? transformMember(pendingTimesheetRecord.reviewer)
            : null,
        }
      : null;
  const assignedTasks: IHrmPlatformTask.ISummary[] = await ArrayUtil.asyncMap(
    assignedTasksRecords,
    (t) => transformTask(t),
  );
  return {
    hoursLoggedToday,
    hoursLoggedThisWeek,
    activeTimer,
    recentTimelogs,
    pendingTimesheet,
    assignedTasks,
  } satisfies IHrmPlatformPersonalDashboard;
}
