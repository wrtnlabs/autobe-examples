import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimesheetTimelogAtInvertTransformer {
  export type Payload = Prisma.erp_hrm_timesheet_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        added_at: true,
        timesheet: {
          select: {
            id: true,
            week_start_date: true,
            week_end_date: true,
            status: true,
            total_hours: true,
            submitted_at: true,
            reviewed_at: true,
            employee: {
              select: {
                id: true,
                position: true,
                employment_type: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                member: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_uri: true,
                    phone: true,
                    created_at: true,
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
                        description: true,
                        logo_uri: true,
                        currency: true,
                        timezone: true,
                        fiscal_start_month: true,
                        created_at: true,
                        owner: {
                          select: {
                            id: true,
                            email: true,
                            display_name: true,
                            avatar_uri: true,
                            phone: true,
                            created_at: true,
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
                    parent: {
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
        } satisfies Prisma.erp_hrm_timesheetsFindManyArgs,
        timelog: {
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
                created_at: true,
                updated_at: true,
                deleted_at: true,
                member: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_uri: true,
                    phone: true,
                    created_at: true,
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
                        description: true,
                        logo_uri: true,
                        currency: true,
                        timezone: true,
                        fiscal_start_month: true,
                        created_at: true,
                        owner: {
                          select: {
                            id: true,
                            email: true,
                            display_name: true,
                            avatar_uri: true,
                            phone: true,
                            created_at: true,
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
                    parent: {
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
            project: {
              select: {
                id: true,
                name: true,
                description: true,
                color: true,
                status: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                created_at: true,
                updated_at: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    logo_uri: true,
                    currency: true,
                    timezone: true,
                    fiscal_start_month: true,
                    created_at: true,
                    owner: {
                      select: {
                        id: true,
                        email: true,
                        display_name: true,
                        avatar_uri: true,
                        phone: true,
                        created_at: true,
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
                description: true,
                status: true,
                priority: true,
                estimated_hours: true,
                due_date: true,
                created_at: true,
                updated_at: true,
                _count: {
                  select: {
                    subtasks: true,
                    taskHistories: true,
                    timelogs: true,
                    timers: true,
                  },
                },
                project: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    color: true,
                    status: true,
                    budget_hours: true,
                    start_date: true,
                    end_date: true,
                    created_at: true,
                    updated_at: true,
                    organization: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        logo_uri: true,
                        currency: true,
                        timezone: true,
                        fiscal_start_month: true,
                        created_at: true,
                        owner: {
                          select: {
                            id: true,
                            email: true,
                            display_name: true,
                            avatar_uri: true,
                            phone: true,
                            created_at: true,
                          },
                        },
                      },
                    },
                  },
                },
                assignee: {
                  select: {
                    id: true,
                    position: true,
                    employment_type: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    member: {
                      select: {
                        id: true,
                        email: true,
                        display_name: true,
                        avatar_uri: true,
                        phone: true,
                        created_at: true,
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
                            description: true,
                            logo_uri: true,
                            currency: true,
                            timezone: true,
                            fiscal_start_month: true,
                            created_at: true,
                            owner: {
                              select: {
                                id: true,
                                email: true,
                                display_name: true,
                                avatar_uri: true,
                                phone: true,
                                created_at: true,
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
                        parent: {
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
                parent: true,
              },
            } satisfies Prisma.erp_hrm_tasksFindManyArgs,
          },
        } satisfies Prisma.erp_hrm_timelogsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_timesheet_timelogsFindManyArgs;
  }
  function transformMember(
    input: Payload["timelog"]["employee"]["member"],
  ): IErpHrmMember.ISummary {
    return {
      id: input.id,
      email: input.email,
      displayName: input.display_name,
      avatarUri: input.avatar_uri ?? undefined,
      phone: input.phone ?? undefined,
      createdAt: input.created_at.toISOString(),
    };
  }
  function transformOrganization(
    input: Payload["timelog"]["project"]["organization"],
  ): IErpHrmOrganization.ISummary {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      logoUri: input.logo_uri ?? undefined,
      currency: input.currency,
      timezone: input.timezone,
      fiscalStartMonth: input.fiscal_start_month,
      createdAt: input.created_at.toISOString(),
      owner: transformMember(input.owner),
    };
  }
  function transformRole(
    input: Payload["timelog"]["employee"]["role"],
  ): IErpHrmRole.ISummary {
    return {
      id: input.id,
      name: input.name,
      is_builtin: input.is_builtin,
      created_at: input.created_at.toISOString(),
      organization: transformOrganization(input.organization),
    };
  }
  function transformDepartment(
    input: Payload["timelog"]["employee"]["department"] | null | undefined,
  ): IErpHrmDepartment.ISummary | null | undefined {
    if (!input) return undefined;
    return {
      created_at: input.created_at.toISOString(),
      description: input.description ?? undefined,
      id: input.id,
      name: input.name,
      parent: input.parent
        ? {
            created_at: input.parent.created_at.toISOString(),
            description: input.parent.description ?? undefined,
            id: input.parent.id,
            name: input.parent.name,
            updated_at: input.parent.updated_at.toISOString(),
          }
        : undefined,
      updated_at: input.updated_at.toISOString(),
    };
  }
  function transformEmployee(
    input: Payload["timelog"]["employee"],
  ): IErpHrmEmployee.ISummary {
    return {
      id: input.id,
      position: input.position ?? undefined,
      employment_type: input.employment_type,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      member: transformMember(input.member),
      role: transformRole(input.role),
      department: input.department
        ? (transformDepartment(input.department) ?? null)
        : null,
    };
  }
  function transformProject(
    input: Payload["timelog"]["project"],
  ): IErpHrmProjectMember.ISummary {
    return {
      id: input.id,
      name: input.name,
      color: input.color,
      status: input.status,
      budget_hours: input.budget_hours ?? undefined,
      start_date: input.start_date ? input.start_date.toISOString() : null,
      end_date: input.end_date ? input.end_date.toISOString() : null,
      created_at: input.created_at.toISOString(),
      organization: transformOrganization(input.organization),
    };
  }
  function transformTask(
    input: Payload["timelog"]["task"],
  ): IErpHrmTask.ISummary {
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      project: transformProject(input.project),
      assignee: input.assignee ? transformEmployee(input.assignee) : undefined,
      due_date: input.due_date ? input.due_date.toISOString() : undefined,
      subtasks_count: input._count.subtasks,
      task_histories_count: input._count.taskHistories,
      timelogs_count: input._count.timelogs,
      timers_count: input._count.timers,
    };
  }
  function transformTimelog(input: Payload["timelog"]): IErpHrmTimelog {
    return {
      id: input.id,
      date: input.date.toISOString(),
      duration_minutes: input.duration_minutes,
      description: input.description ?? undefined,
      billable: input.billable,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      employee: transformEmployee(input.employee),
      project: transformProject(input.project),
      task: input.task ? transformTask(input.task) : undefined,
    };
  }
  function transformTimesheetEmployee(
    input: Payload["timesheet"]["employee"],
  ): IErpHrmEmployee.ISummary {
    return {
      id: input.id,
      position: input.position ?? undefined,
      employment_type: input.employment_type,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      member: transformMember(input.member),
      role: transformRole(input.role),
      department: input.department
        ? (transformDepartment(input.department) ?? null)
        : null,
    };
  }
  function transformTimesheet(
    input: Payload["timesheet"],
  ): IErpHrmTimesheet.ISummary {
    return {
      employee: transformTimesheetEmployee(input.employee),
      id: input.id,
      reviewedAt: input.reviewed_at ? input.reviewed_at.toISOString() : null,
      status: input.status,
      submittedAt: input.submitted_at ? input.submitted_at.toISOString() : null,
      totalHours: input.total_hours,
      weekEndDate: input.week_end_date.toISOString(),
      weekStartDate: input.week_start_date.toISOString(),
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimesheetTimelog.IInvert> {
    return {
      id: input.id,
      addedAt: input.added_at.toISOString(),
      erpHrmTimelog: transformTimelog(input.timelog),
      erpHrmEmployee: transformEmployee(input.timelog.employee),
      erpHrmProject: transformProject(input.timelog.project),
      erpHrmTask: input.timelog.task
        ? transformTask(input.timelog.task)
        : undefined,
      erpHrmTimesheet: transformTimesheet(input.timesheet),
    };
  }
}
