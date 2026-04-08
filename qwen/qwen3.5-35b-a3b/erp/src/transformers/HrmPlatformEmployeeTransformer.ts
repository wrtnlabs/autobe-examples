import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformTaskAtSummaryTransformer } from "./HrmPlatformTaskAtSummaryTransformer";

export namespace HrmPlatformEmployeeTransformer {
  export type Payload = Prisma.hrm_platform_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        employee_code: true,
        display_name: true,
        email: true,
        phone_number: true,
        job_title: true,
        job_level: true,
        employment_type: true,
        start_date: true,
        end_date: true,
        status: true,
        is_pending: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
            currency: true,
            timezone: true,
            fiscal_start_month: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            owner: {
              select: {
                id: true,
                email: true,
                display_name: true,
                avatar_uri: true,
                phone_number: true,
                is_active: true,
                last_login_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        member: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_uri: true,
            phone_number: true,
            is_active: true,
            last_login_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            role_kind: true,
            organization: {
              select: {
                id: true,
                name: true,
                description: true,
                currency: true,
                timezone: true,
                fiscal_start_month: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                owner: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_uri: true,
                    phone_number: true,
                    is_active: true,
                    last_login_at: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
            _count: { select: { employees: true } },
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            created_at: true,
            updated_at: true,
            organization: {
              select: {
                id: true,
                name: true,
                description: true,
                currency: true,
                timezone: true,
                fiscal_start_month: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                owner: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_uri: true,
                    phone_number: true,
                    is_active: true,
                    last_login_at: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
            parentDepartment: {
              select: {
                id: true,
                name: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    currency: true,
                    timezone: true,
                    fiscal_start_month: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    owner: {
                      select: {
                        id: true,
                        email: true,
                        display_name: true,
                        avatar_uri: true,
                        phone_number: true,
                        is_active: true,
                        last_login_at: true,
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
        },
        contracts: {
          select: {
            id: true,
            title: true,
            start_date: true,
            end_date: true,
            compensation_amount: true,
            compensation_currency: true,
            status: true,
            created_at: true,
            employee: {
              select: {
                id: true,
                employee_code: true,
                display_name: true,
                email: true,
                phone_number: true,
                job_title: true,
                job_level: true,
                employment_type: true,
                start_date: true,
                end_date: true,
                status: true,
                is_pending: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        projectMemberships: {
          select: {
            id: true,
            role: true,
            created_at: true,
            deleted_at: true,
            employee: {
              select: {
                id: true,
                employee_code: true,
                display_name: true,
                email: true,
                phone_number: true,
                job_title: true,
                job_level: true,
                employment_type: true,
                start_date: true,
                end_date: true,
                status: true,
                is_pending: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                status: true,
                color_code: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                description: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
        assignedTasks: HrmPlatformTaskAtSummaryTransformer.select(),
        timers: {
          select: {
            id: true,
            status: true,
            last_tick_at: true,
            duration_seconds: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            project: {
              select: {
                id: true,
                name: true,
                status: true,
                color_code: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                description: true,
                created_at: true,
                updated_at: true,
              },
            },
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                created_at: true,
                due_date: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                    color_code: true,
                    budget_hours: true,
                    start_date: true,
                    end_date: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
                assignedEmployee: {
                  select: {
                    id: true,
                    employee_code: true,
                    display_name: true,
                    email: true,
                    phone_number: true,
                    job_title: true,
                    job_level: true,
                    employment_type: true,
                    start_date: true,
                    end_date: true,
                    status: true,
                    is_pending: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                parentTask: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    created_at: true,
                    due_date: true,
                    project: {
                      select: {
                        id: true,
                        name: true,
                        status: true,
                        color_code: true,
                        budget_hours: true,
                        start_date: true,
                        end_date: true,
                        description: true,
                        created_at: true,
                        updated_at: true,
                      },
                    },
                    assignedEmployee: true,
                    parentTask: true,
                  },
                },
              },
            },
          },
        },
        timelogs: {
          select: {
            id: true,
            start_datetime: true,
            end_datetime: true,
            duration_minutes: true,
            billable: true,
            description: true,
            employee: {
              select: {
                id: true,
                employee_code: true,
                display_name: true,
                email: true,
                phone_number: true,
                job_title: true,
                job_level: true,
                employment_type: true,
                start_date: true,
                end_date: true,
                status: true,
                is_pending: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                status: true,
                color_code: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                description: true,
                created_at: true,
                updated_at: true,
              },
            },
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                created_at: true,
                due_date: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                    color_code: true,
                    budget_hours: true,
                    start_date: true,
                    end_date: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
                assignedEmployee: {
                  select: {
                    id: true,
                    employee_code: true,
                    display_name: true,
                    email: true,
                    phone_number: true,
                    job_title: true,
                    job_level: true,
                    employment_type: true,
                    start_date: true,
                    end_date: true,
                    status: true,
                    is_pending: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                parentTask: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    created_at: true,
                    due_date: true,
                    project: {
                      select: {
                        id: true,
                        name: true,
                        status: true,
                        color_code: true,
                        budget_hours: true,
                        start_date: true,
                        end_date: true,
                        description: true,
                        created_at: true,
                        updated_at: true,
                      },
                    },
                    assignedEmployee: true,
                    parentTask: true,
                  },
                },
              },
            },
          },
        },
        timesheets: {
          select: {
            id: true,
            start_date: true,
            end_date: true,
            status: true,
            notes: true,
            total_hours: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            employee: {
              select: {
                id: true,
                employee_code: true,
                display_name: true,
                email: true,
                phone_number: true,
                job_title: true,
                job_level: true,
                employment_type: true,
                start_date: true,
                end_date: true,
                status: true,
                is_pending: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        timesheetWeeklyStats: {
          select: {
            id: true,
            employee_id: true,
            week_start: true,
            week_end: true,
            total_hours: true,
            billable_hours: true,
          },
        },
      },
    } satisfies Prisma.hrm_platform_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformEmployee> {
    const buildMemberSummary = (m: {
      id: string;
      email: string;
      display_name?: string | null;
      avatar_uri?: string | null;
      phone_number?: string | null;
      is_active: boolean;
      last_login_at?: Date | null;
      created_at: Date;
      updated_at: Date;
      deleted_at?: Date | null;
    }): IHrmPlatformMember.ISummary => ({
      id: m.id,
      email: m.email,
      display_name: m.display_name ?? undefined,
      avatar_uri: m.avatar_uri ?? undefined,
      phone_number: m.phone_number ?? undefined,
      is_active: m.is_active,
      last_login_at: m.last_login_at ? toISOStringSafe(m.last_login_at) : null,
      created_at: toISOStringSafe(m.created_at),
      updated_at: toISOStringSafe(m.updated_at),
      deleted_at: m.deleted_at ? toISOStringSafe(m.deleted_at) : null,
    });
    const buildOrganizationSummary = (org: {
      id: string;
      name: string;
      description: string | null;
      currency?: string | null;
      timezone?: string | null;
      fiscal_start_month?: number | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
      owner: {
        id: string;
        email: string;
        display_name?: string | null;
        avatar_uri?: string | null;
        phone_number?: string | null;
        is_active: boolean;
        last_login_at?: Date | null;
        created_at: Date;
        updated_at: Date;
        deleted_at?: Date | null;
      };
    }): IHrmPlatformOrganization.ISummary => ({
      id: org.id,
      name: org.name,
      description: org.description ?? null,
      currency: org.currency ?? undefined,
      timezone: org.timezone ?? undefined,
      fiscal_start_month: org.fiscal_start_month ?? undefined,
      created_at: toISOStringSafe(org.created_at),
      updated_at: toISOStringSafe(org.updated_at),
      deleted_at: org.deleted_at ? toISOStringSafe(org.deleted_at) : null,
      owner: buildMemberSummary(org.owner),
    });
    const buildDepartmentSummary = (
      dept: Payload["department"] | null,
    ): IHrmPlatformDepartment.ISummary | null => {
      if (!dept) return null;
      return {
        id: dept.id,
        name: dept.name,
        organization: buildOrganizationSummary({
          id: dept.organization.id,
          name: dept.organization.name,
          description: dept.organization.description ?? null,
          currency: dept.organization.currency ?? undefined,
          timezone: dept.organization.timezone ?? undefined,
          fiscal_start_month: dept.organization.fiscal_start_month ?? undefined,
          created_at: dept.organization.created_at,
          updated_at: dept.organization.updated_at,
          deleted_at: dept.organization.deleted_at,
          owner: {
            id: dept.organization.owner.id,
            email: dept.organization.owner.email,
            display_name: dept.organization.owner.display_name ?? undefined,
            avatar_uri: dept.organization.owner.avatar_uri ?? undefined,
            phone_number: dept.organization.owner.phone_number ?? undefined,
            is_active: dept.organization.owner.is_active,
            last_login_at: dept.organization.owner.last_login_at,
            created_at: dept.organization.owner.created_at,
            updated_at: dept.organization.owner.updated_at,
            deleted_at: dept.organization.owner.deleted_at,
          },
        }),
        parentDepartment: dept.parentDepartment
          ? {
              id: dept.parentDepartment.id,
              name: dept.parentDepartment.name,
              organization: buildOrganizationSummary({
                id: dept.parentDepartment.organization.id,
                name: dept.parentDepartment.organization.name,
                description:
                  dept.parentDepartment.organization.description ?? null,
                currency:
                  dept.parentDepartment.organization.currency ?? undefined,
                timezone:
                  dept.parentDepartment.organization.timezone ?? undefined,
                fiscal_start_month:
                  dept.parentDepartment.organization.fiscal_start_month ??
                  undefined,
                created_at: dept.parentDepartment.organization.created_at,
                updated_at: dept.parentDepartment.organization.updated_at,
                deleted_at: dept.parentDepartment.organization.deleted_at,
                owner: {
                  id: dept.parentDepartment.organization.owner.id,
                  email: dept.parentDepartment.organization.owner.email,
                  display_name:
                    dept.parentDepartment.organization.owner.display_name ??
                    undefined,
                  avatar_uri:
                    dept.parentDepartment.organization.owner.avatar_uri ??
                    undefined,
                  phone_number:
                    dept.parentDepartment.organization.owner.phone_number ??
                    undefined,
                  is_active: dept.parentDepartment.organization.owner.is_active,
                  last_login_at:
                    dept.parentDepartment.organization.owner.last_login_at,
                  created_at:
                    dept.parentDepartment.organization.owner.created_at,
                  updated_at:
                    dept.parentDepartment.organization.owner.updated_at,
                  deleted_at:
                    dept.parentDepartment.organization.owner.deleted_at,
                },
              }),
              parentDepartment: null,
              created_at: toISOStringSafe(dept.parentDepartment.created_at),
              updated_at: toISOStringSafe(dept.parentDepartment.updated_at),
            }
          : null,
        created_at: toISOStringSafe(dept.created_at),
        updated_at: toISOStringSafe(dept.updated_at),
      };
    };
    const buildProjectSummary = (proj: {
      id: string;
      name: string;
      status: string;
      color_code: string;
      budget_hours?: number | null;
      start_date?: Date | null;
      end_date?: Date | null;
      description?: string | null;
      created_at: Date;
      updated_at: Date;
    }): IHrmPlatformProject.ISummary => ({
      id: proj.id,
      name: proj.name,
      status: proj.status,
      color_code: proj.color_code,
      budget_hours: proj.budget_hours ?? null,
      start_date: proj.start_date ? toISOStringSafe(proj.start_date) : null,
      end_date: proj.end_date ? toISOStringSafe(proj.end_date) : null,
      description: proj.description ?? null,
      total_hours: 0,
      billable_hours: 0,
      non_billable_hours: 0,
      timelog_count: 0,
      employee_count: 0,
      budget_utilization: null,
      created_at: toISOStringSafe(proj.created_at),
      updated_at: toISOStringSafe(proj.updated_at),
    });
    const buildEmployeeSummary = (emp: {
      id: string;
      employee_code: string;
      display_name: string;
      email: string;
      phone_number?: string | null;
      job_title?: string | null;
      job_level: string;
      employment_type: string;
      start_date: Date;
      end_date?: Date | null;
      status: string;
      is_pending: boolean;
      created_at: Date;
      updated_at: Date;
      deleted_at?: Date | null;
    }): IHrmPlatformEmployee.ISummary => ({
      id: emp.id,
      employee_code: emp.employee_code,
      display_name: emp.display_name,
      email: emp.email,
      phone_number: emp.phone_number ?? undefined,
      job_title: emp.job_title ?? undefined,
      job_level: emp.job_level,
      employment_type: emp.employment_type,
      start_date: toISOStringSafe(emp.start_date),
      end_date: emp.end_date ? toISOStringSafe(emp.end_date) : null,
      status: emp.status,
      is_pending: emp.is_pending,
      created_at: toISOStringSafe(emp.created_at),
      updated_at: toISOStringSafe(emp.updated_at),
      deleted_at: emp.deleted_at ? toISOStringSafe(emp.deleted_at) : null,
      organization: buildOrganizationSummary({
        id: input.organization.id,
        name: input.organization.name,
        description: input.organization.description ?? null,
        currency: input.organization.currency ?? undefined,
        timezone: input.organization.timezone ?? undefined,
        fiscal_start_month: input.organization.fiscal_start_month ?? undefined,
        created_at: input.organization.created_at,
        updated_at: input.organization.updated_at,
        deleted_at: input.organization.deleted_at,
        owner: {
          id: input.organization.owner.id,
          email: input.organization.owner.email,
          display_name: input.organization.owner.display_name ?? undefined,
          avatar_uri: input.organization.owner.avatar_uri ?? undefined,
          phone_number: input.organization.owner.phone_number ?? undefined,
          is_active: input.organization.owner.is_active,
          last_login_at: input.organization.owner.last_login_at,
          created_at: input.organization.owner.created_at,
          updated_at: input.organization.owner.updated_at,
          deleted_at: input.organization.owner.deleted_at,
        },
      }),
      member: buildMemberSummary({
        id: input.member.id,
        email: input.member.email,
        display_name: input.member.display_name ?? undefined,
        avatar_uri: input.member.avatar_uri ?? undefined,
        phone_number: input.member.phone_number ?? undefined,
        is_active: input.member.is_active,
        last_login_at: input.member.last_login_at,
        created_at: input.member.created_at,
        updated_at: input.member.updated_at,
        deleted_at: input.member.deleted_at,
      }),
      role: {
        id: input.role.id,
        name: input.role.name,
        role_kind: input.role.role_kind,
        organization: buildOrganizationSummary({
          id: input.role.organization.id,
          name: input.role.organization.name,
          description: input.role.organization.description ?? null,
          currency: input.role.organization.currency ?? undefined,
          timezone: input.role.organization.timezone ?? undefined,
          fiscal_start_month:
            input.role.organization.fiscal_start_month ?? undefined,
          created_at: input.role.organization.created_at,
          updated_at: input.role.organization.updated_at,
          deleted_at: input.role.organization.deleted_at,
          owner: {
            id: input.role.organization.owner.id,
            email: input.role.organization.owner.email,
            display_name:
              input.role.organization.owner.display_name ?? undefined,
            avatar_uri: input.role.organization.owner.avatar_uri ?? undefined,
            phone_number:
              input.role.organization.owner.phone_number ?? undefined,
            is_active: input.role.organization.owner.is_active,
            last_login_at: input.role.organization.owner.last_login_at,
            created_at: input.role.organization.owner.created_at,
            updated_at: input.role.organization.owner.updated_at,
            deleted_at: input.role.organization.owner.deleted_at,
          },
        }),
        permissions_count: input.role._count.employees,
      },
      department: buildDepartmentSummary(input.department),
    });
    return {
      id: input.id,
      employee_code: input.employee_code,
      display_name: input.display_name,
      email: input.email,
      phone_number: input.phone_number ?? undefined,
      job_title: input.job_title ?? undefined,
      job_level: input.job_level,
      employment_type: input.employment_type,
      start_date: toISOStringSafe(input.start_date),
      end_date: input.end_date ? toISOStringSafe(input.end_date) : null,
      status: input.status,
      is_pending: input.is_pending,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      organization: buildOrganizationSummary({
        id: input.organization.id,
        name: input.organization.name,
        description: input.organization.description ?? null,
        currency: input.organization.currency ?? undefined,
        timezone: input.organization.timezone ?? undefined,
        fiscal_start_month: input.organization.fiscal_start_month ?? undefined,
        created_at: input.organization.created_at,
        updated_at: input.organization.updated_at,
        deleted_at: input.organization.deleted_at,
        owner: {
          id: input.organization.owner.id,
          email: input.organization.owner.email,
          display_name: input.organization.owner.display_name ?? undefined,
          avatar_uri: input.organization.owner.avatar_uri ?? undefined,
          phone_number: input.organization.owner.phone_number ?? undefined,
          is_active: input.organization.owner.is_active,
          last_login_at: input.organization.owner.last_login_at,
          created_at: input.organization.owner.created_at,
          updated_at: input.organization.owner.updated_at,
          deleted_at: input.organization.owner.deleted_at,
        },
      }),
      member: buildMemberSummary({
        id: input.member.id,
        email: input.member.email,
        display_name: input.member.display_name ?? undefined,
        avatar_uri: input.member.avatar_uri ?? undefined,
        phone_number: input.member.phone_number ?? undefined,
        is_active: input.member.is_active,
        last_login_at: input.member.last_login_at,
        created_at: input.member.created_at,
        updated_at: input.member.updated_at,
        deleted_at: input.member.deleted_at,
      }),
      role: {
        id: input.role.id,
        name: input.role.name,
        role_kind: input.role.role_kind,
        organization: buildOrganizationSummary({
          id: input.role.organization.id,
          name: input.role.organization.name,
          description: input.role.organization.description ?? null,
          currency: input.role.organization.currency ?? undefined,
          timezone: input.role.organization.timezone ?? undefined,
          fiscal_start_month:
            input.role.organization.fiscal_start_month ?? undefined,
          created_at: input.role.organization.created_at,
          updated_at: input.role.organization.updated_at,
          deleted_at: input.role.organization.deleted_at,
          owner: {
            id: input.role.organization.owner.id,
            email: input.role.organization.owner.email,
            display_name:
              input.role.organization.owner.display_name ?? undefined,
            avatar_uri: input.role.organization.owner.avatar_uri ?? undefined,
            phone_number:
              input.role.organization.owner.phone_number ?? undefined,
            is_active: input.role.organization.owner.is_active,
            last_login_at: input.role.organization.owner.last_login_at,
            created_at: input.role.organization.owner.created_at,
            updated_at: input.role.organization.owner.updated_at,
            deleted_at: input.role.organization.owner.deleted_at,
          },
        }),
        permissions_count: input.role._count.employees,
      },
      department: buildDepartmentSummary(input.department),
      contracts: input.contracts.map((c) => ({
        id: c.id,
        title: c.title,
        start_date: toISOStringSafe(c.start_date),
        end_date: c.end_date ? toISOStringSafe(c.end_date) : null,
        compensation_amount: c.compensation_amount ?? null,
        compensation_currency: c.compensation_currency ?? null,
        status: c.status,
        created_at: toISOStringSafe(c.created_at),
        employee: buildEmployeeSummary({
          id: c.employee.id,
          employee_code: c.employee.employee_code,
          display_name: c.employee.display_name,
          email: c.employee.email,
          phone_number: c.employee.phone_number ?? undefined,
          job_title: c.employee.job_title ?? undefined,
          job_level: c.employee.job_level,
          employment_type: c.employee.employment_type,
          start_date: c.employee.start_date,
          end_date: c.employee.end_date ?? undefined,
          status: c.employee.status,
          is_pending: c.employee.is_pending,
          created_at: c.employee.created_at,
          updated_at: c.employee.updated_at,
          deleted_at: c.employee.deleted_at ?? undefined,
        }),
      })),
      projectMemberships: input.projectMemberships.map((pm) => ({
        id: pm.id,
        role: pm.role,
        created_at: toISOStringSafe(pm.created_at),
        deleted_at: pm.deleted_at ? toISOStringSafe(pm.deleted_at) : null,
        employee: buildEmployeeSummary({
          id: pm.employee.id,
          employee_code: pm.employee.employee_code,
          display_name: pm.employee.display_name,
          email: pm.employee.email,
          phone_number: pm.employee.phone_number ?? undefined,
          job_title: pm.employee.job_title ?? undefined,
          job_level: pm.employee.job_level,
          employment_type: pm.employee.employment_type,
          start_date: pm.employee.start_date,
          end_date: pm.employee.end_date ?? undefined,
          status: pm.employee.status,
          is_pending: pm.employee.is_pending,
          created_at: pm.employee.created_at,
          updated_at: pm.employee.updated_at,
          deleted_at: pm.employee.deleted_at ?? undefined,
        }),
        project: buildProjectSummary({
          id: pm.project.id,
          name: pm.project.name,
          status: pm.project.status,
          color_code: pm.project.color_code,
          budget_hours: pm.project.budget_hours ?? undefined,
          start_date: pm.project.start_date,
          end_date: pm.project.end_date,
          description: pm.project.description ?? undefined,
          created_at: pm.project.created_at,
          updated_at: pm.project.updated_at,
        }),
      })),
      assignedTasks: await ArrayUtil.asyncMap(input.assignedTasks, (t) =>
        HrmPlatformTaskAtSummaryTransformer.transform(t),
      ),
      timers: input.timers.map((t) => ({
        id: t.id,
        status: t.status,
        lastTickAt: toISOStringSafe(t.last_tick_at),
        durationSeconds: t.duration_seconds,
        createdAt: toISOStringSafe(t.created_at),
        updatedAt: toISOStringSafe(t.updated_at),
        deletedAt: t.deleted_at ? toISOStringSafe(t.deleted_at) : null,
        project: t.project
          ? buildProjectSummary({
              id: t.project.id,
              name: t.project.name,
              status: t.project.status,
              color_code: t.project.color_code,
              budget_hours: t.project.budget_hours ?? undefined,
              start_date: t.project.start_date,
              end_date: t.project.end_date,
              description: t.project.description ?? undefined,
              created_at: t.project.created_at,
              updated_at: t.project.updated_at,
            })
          : null,
        task: t.task
          ? {
              id: t.task.id,
              title: t.task.title,
              status: t.task.status,
              priority: t.task.priority,
              created_at: toISOStringSafe(t.task.created_at),
              due_date: t.task.due_date
                ? toISOStringSafe(t.task.due_date)
                : null,
              project: buildProjectSummary({
                id: t.task.project.id,
                name: t.task.project.name,
                status: t.task.project.status,
                color_code: t.task.project.color_code,
                budget_hours: t.task.project.budget_hours ?? undefined,
                start_date: t.task.project.start_date,
                end_date: t.task.project.end_date,
                description: t.task.project.description ?? undefined,
                created_at: t.task.project.created_at,
                updated_at: t.task.project.updated_at,
              }),
              assignedEmployee: t.task.assignedEmployee
                ? buildEmployeeSummary({
                    id: t.task.assignedEmployee.id,
                    employee_code: t.task.assignedEmployee.employee_code,
                    display_name: t.task.assignedEmployee.display_name,
                    email: t.task.assignedEmployee.email,
                    phone_number:
                      t.task.assignedEmployee.phone_number ?? undefined,
                    job_title: t.task.assignedEmployee.job_title ?? undefined,
                    job_level: t.task.assignedEmployee.job_level,
                    employment_type: t.task.assignedEmployee.employment_type,
                    start_date: t.task.assignedEmployee.start_date,
                    end_date: t.task.assignedEmployee.end_date ?? undefined,
                    status: t.task.assignedEmployee.status,
                    is_pending: t.task.assignedEmployee.is_pending,
                    created_at: t.task.assignedEmployee.created_at,
                    updated_at: t.task.assignedEmployee.updated_at,
                    deleted_at: t.task.assignedEmployee.deleted_at ?? undefined,
                  })
                : null,
              parentTask: t.task.parentTask
                ? {
                    id: t.task.parentTask.id,
                    title: t.task.parentTask.title,
                    status: t.task.parentTask.status,
                    priority: t.task.parentTask.priority,
                    created_at: toISOStringSafe(t.task.parentTask.created_at),
                    due_date: t.task.parentTask.due_date
                      ? toISOStringSafe(t.task.parentTask.due_date)
                      : null,
                    project: buildProjectSummary({
                      id: t.task.parentTask.project.id,
                      name: t.task.parentTask.project.name,
                      status: t.task.parentTask.project.status,
                      color_code: t.task.parentTask.project.color_code,
                      budget_hours:
                        t.task.parentTask.project.budget_hours ?? undefined,
                      start_date: t.task.parentTask.project.start_date,
                      end_date: t.task.parentTask.project.end_date,
                      description:
                        t.task.parentTask.project.description ?? undefined,
                      created_at: t.task.parentTask.project.created_at,
                      updated_at: t.task.parentTask.project.updated_at,
                    }),
                    assignedEmployee: t.task.parentTask.assignedEmployee
                      ? buildEmployeeSummary({
                          id: t.task.parentTask.assignedEmployee.id,
                          employee_code:
                            t.task.parentTask.assignedEmployee.employee_code,
                          display_name:
                            t.task.parentTask.assignedEmployee.display_name,
                          email: t.task.parentTask.assignedEmployee.email,
                          phone_number:
                            t.task.parentTask.assignedEmployee.phone_number ??
                            undefined,
                          job_title:
                            t.task.parentTask.assignedEmployee.job_title ??
                            undefined,
                          job_level:
                            t.task.parentTask.assignedEmployee.job_level,
                          employment_type:
                            t.task.parentTask.assignedEmployee.employment_type,
                          start_date:
                            t.task.parentTask.assignedEmployee.start_date,
                          end_date:
                            t.task.parentTask.assignedEmployee.end_date ??
                            undefined,
                          status: t.task.parentTask.assignedEmployee.status,
                          is_pending:
                            t.task.parentTask.assignedEmployee.is_pending,
                          created_at:
                            t.task.parentTask.assignedEmployee.created_at,
                          updated_at:
                            t.task.parentTask.assignedEmployee.updated_at,
                          deleted_at:
                            t.task.parentTask.assignedEmployee.deleted_at ??
                            undefined,
                        })
                      : null,
                    parentTask: null,
                  }
                : null,
            }
          : null,
      })),
      timelogs: input.timelogs.map((tl) => ({
        id: tl.id,
        start_datetime: toISOStringSafe(tl.start_datetime),
        end_datetime: toISOStringSafe(tl.end_datetime),
        duration_minutes: tl.duration_minutes,
        billable: tl.billable,
        description: tl.description ?? undefined,
        employee: buildEmployeeSummary({
          id: tl.employee.id,
          employee_code: tl.employee.employee_code,
          display_name: tl.employee.display_name,
          email: tl.employee.email,
          phone_number: tl.employee.phone_number ?? undefined,
          job_title: tl.employee.job_title ?? undefined,
          job_level: tl.employee.job_level,
          employment_type: tl.employee.employment_type,
          start_date: tl.employee.start_date,
          end_date: tl.employee.end_date ?? undefined,
          status: tl.employee.status,
          is_pending: tl.employee.is_pending,
          created_at: tl.employee.created_at,
          updated_at: tl.employee.updated_at,
          deleted_at: tl.employee.deleted_at ?? undefined,
        }),
        project: buildProjectSummary({
          id: tl.project.id,
          name: tl.project.name,
          status: tl.project.status,
          color_code: tl.project.color_code,
          budget_hours: tl.project.budget_hours ?? undefined,
          start_date: tl.project.start_date,
          end_date: tl.project.end_date,
          description: tl.project.description ?? undefined,
          created_at: tl.project.created_at,
          updated_at: tl.project.updated_at,
        }),
        task: tl.task
          ? {
              id: tl.task.id,
              title: tl.task.title,
              status: tl.task.status,
              priority: tl.task.priority,
              created_at: toISOStringSafe(tl.task.created_at),
              due_date: tl.task.due_date
                ? toISOStringSafe(tl.task.due_date)
                : null,
              project: buildProjectSummary({
                id: tl.task.project.id,
                name: tl.task.project.name,
                status: tl.task.project.status,
                color_code: tl.task.project.color_code,
                budget_hours: tl.task.project.budget_hours ?? undefined,
                start_date: tl.task.project.start_date,
                end_date: tl.task.project.end_date,
                description: tl.task.project.description ?? undefined,
                created_at: tl.task.project.created_at,
                updated_at: tl.task.project.updated_at,
              }),
              assignedEmployee: tl.task.assignedEmployee
                ? buildEmployeeSummary({
                    id: tl.task.assignedEmployee.id,
                    employee_code: tl.task.assignedEmployee.employee_code,
                    display_name: tl.task.assignedEmployee.display_name,
                    email: tl.task.assignedEmployee.email,
                    phone_number:
                      tl.task.assignedEmployee.phone_number ?? undefined,
                    job_title: tl.task.assignedEmployee.job_title ?? undefined,
                    job_level: tl.task.assignedEmployee.job_level,
                    employment_type: tl.task.assignedEmployee.employment_type,
                    start_date: tl.task.assignedEmployee.start_date,
                    end_date: tl.task.assignedEmployee.end_date ?? undefined,
                    status: tl.task.assignedEmployee.status,
                    is_pending: tl.task.assignedEmployee.is_pending,
                    created_at: tl.task.assignedEmployee.created_at,
                    updated_at: tl.task.assignedEmployee.updated_at,
                    deleted_at:
                      tl.task.assignedEmployee.deleted_at ?? undefined,
                  })
                : null,
              parentTask: tl.task.parentTask
                ? {
                    id: tl.task.parentTask.id,
                    title: tl.task.parentTask.title,
                    status: tl.task.parentTask.status,
                    priority: tl.task.parentTask.priority,
                    created_at: toISOStringSafe(tl.task.parentTask.created_at),
                    due_date: tl.task.parentTask.due_date
                      ? toISOStringSafe(tl.task.parentTask.due_date)
                      : null,
                    project: buildProjectSummary({
                      id: tl.task.parentTask.project.id,
                      name: tl.task.parentTask.project.name,
                      status: tl.task.parentTask.project.status,
                      color_code: tl.task.parentTask.project.color_code,
                      budget_hours:
                        tl.task.parentTask.project.budget_hours ?? undefined,
                      start_date: tl.task.parentTask.project.start_date,
                      end_date: tl.task.parentTask.project.end_date,
                      description:
                        tl.task.parentTask.project.description ?? undefined,
                      created_at: tl.task.parentTask.project.created_at,
                      updated_at: tl.task.parentTask.project.updated_at,
                    }),
                    assignedEmployee: tl.task.parentTask.assignedEmployee
                      ? buildEmployeeSummary({
                          id: tl.task.parentTask.assignedEmployee.id,
                          employee_code:
                            tl.task.parentTask.assignedEmployee.employee_code,
                          display_name:
                            tl.task.parentTask.assignedEmployee.display_name,
                          email: tl.task.parentTask.assignedEmployee.email,
                          phone_number:
                            tl.task.parentTask.assignedEmployee.phone_number ??
                            undefined,
                          job_title:
                            tl.task.parentTask.assignedEmployee.job_title ??
                            undefined,
                          job_level:
                            tl.task.parentTask.assignedEmployee.job_level,
                          employment_type:
                            tl.task.parentTask.assignedEmployee.employment_type,
                          start_date:
                            tl.task.parentTask.assignedEmployee.start_date,
                          end_date:
                            tl.task.parentTask.assignedEmployee.end_date ??
                            undefined,
                          status: tl.task.parentTask.assignedEmployee.status,
                          is_pending:
                            tl.task.parentTask.assignedEmployee.is_pending,
                          created_at:
                            tl.task.parentTask.assignedEmployee.created_at,
                          updated_at:
                            tl.task.parentTask.assignedEmployee.updated_at,
                          deleted_at:
                            tl.task.parentTask.assignedEmployee.deleted_at ??
                            undefined,
                        })
                      : null,
                    parentTask: null,
                  }
                : null,
            }
          : null,
      })),
      timesheets: input.timesheets.map((ts) => ({
        id: ts.id,
        start_date: toISOStringSafe(ts.start_date),
        end_date: toISOStringSafe(ts.end_date),
        status: ts.status as
          | "pending"
          | "submitted"
          | "approved"
          | "rejected"
          | "cancelled",
        notes: ts.notes,
        total_hours: ts.total_hours,
        employee: buildEmployeeSummary({
          id: ts.employee.id,
          employee_code: ts.employee.employee_code,
          display_name: ts.employee.display_name,
          email: ts.employee.email,
          phone_number: ts.employee.phone_number ?? undefined,
          job_title: ts.employee.job_title ?? undefined,
          job_level: ts.employee.job_level,
          employment_type: ts.employee.employment_type,
          start_date: ts.employee.start_date,
          end_date: ts.employee.end_date ?? undefined,
          status: ts.employee.status,
          is_pending: ts.employee.is_pending,
          created_at: ts.employee.created_at,
          updated_at: ts.employee.updated_at,
          deleted_at: ts.employee.deleted_at ?? undefined,
        }),
        created_at: toISOStringSafe(ts.created_at),
        updated_at: toISOStringSafe(ts.updated_at),
        deleted_at: ts.deleted_at ? toISOStringSafe(ts.deleted_at) : null,
      })),
    } satisfies IHrmPlatformEmployee;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformEmployeeTransformer {
//       export type Payload = Prisma.hrm_platform_employeesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             employee_code: true,
//             display_name: true,
//             email: true,
//             phone_number: true,
//             job_title: true,
//             job_level: true,
//             employment_type: true,
//             start_date: true,
//             end_date: true,
//             status: true,
//             is_pending: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             hrm_platform_organization_id: true,
//             hrm_platform_member_id: true,
//             hrm_platform_role_id: true,
//             hrm_platform_department_id: true,
//             assignedTasks: HrmPlatformTaskAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.hrm_platform_employeesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformEmployee> {
//         return {
//   id: {string},
//   employee_code: {string},
//   display_name: {string},
//   email: {string},
//   phone_number: {string | null},
//   job_title: {string | null},
//   job_level: {string},
//   employment_type: {string},
//   start_date: {string},
//   end_date: {string | null},
//   status: {string},
//   is_pending: {boolean},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   organization: {IHrmPlatformOrganization.ISummary},
//   member: {IHrmPlatformMember.ISummary},
//   role: {IHrmPlatformRole.ISummary},
//   department: {IHrmPlatformDepartment.ISummary | null},
//   contracts: {Array<IHrmPlatformContract.ISummary>},
//   projectMemberships: {Array<IHrmPlatformProjectMembership.ISummary>},
//   assignedTasks: await ArrayUtil.asyncMap(input.assignedTasks, HrmPlatformTaskAtSummaryTransformer.transform),
//   timers: {Array<IHrmPlatformTimer.ISummary>},
//   timelogs: {Array<IHrmPlatformTimelog.ISummary>},
//   timesheets: {Array<IHrmPlatformTimesheet.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------