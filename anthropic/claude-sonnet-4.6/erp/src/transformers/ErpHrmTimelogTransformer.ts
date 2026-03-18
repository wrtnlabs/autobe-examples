import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimelogTransformer {
  export type Payload = Prisma.erp_hrm_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        work_date: true,
        duration_minutes: true,
        billable: true,
        description: true,
        created_at: true,
        updated_at: true,
        organizationMember: {
          select: {
            id: true,
            employment_type: true,
            status: true,
            position: true,
            created_at: true,
            updated_at: true,
            member: {
              select: {
                id: true,
                email: true,
                created_at: true,
              },
            },
            role: {
              select: {
                id: true,
                name: true,
                is_builtin: true,
                created_at: true,
                updated_at: true,
                permissions: {
                  select: {
                    id: true,
                    permission_code: true,
                    created_at: true,
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
            started_at: true,
            ended_at: true,
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
            estimated_hours: true,
            due_date: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            assignee: {
              select: {
                id: true,
                employment_type: true,
                status: true,
                position: true,
                created_at: true,
                updated_at: true,
                member: {
                  select: {
                    id: true,
                    email: true,
                    created_at: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    name: true,
                    is_builtin: true,
                    created_at: true,
                    updated_at: true,
                    permissions: {
                      select: {
                        id: true,
                        permission_code: true,
                        created_at: true,
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
            parent: {
              select: {
                id: true,
              },
            },
          },
        },
        timesheet: {
          select: {
            id: true,
            status: true,
            week_start_date: true,
            week_end_date: true,
            submitted_at: true,
            reviewed_at: true,
            rejection_reason: true,
            created_at: true,
            updated_at: true,
            timelogs: {
              select: {
                duration_minutes: true,
              },
            },
            owner: {
              select: {
                id: true,
                employment_type: true,
                status: true,
                position: true,
                created_at: true,
                updated_at: true,
                member: {
                  select: {
                    id: true,
                    email: true,
                    created_at: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    name: true,
                    is_builtin: true,
                    created_at: true,
                    updated_at: true,
                    permissions: {
                      select: {
                        id: true,
                        permission_code: true,
                        created_at: true,
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
            reviewer: {
              select: {
                id: true,
                employment_type: true,
                status: true,
                position: true,
                created_at: true,
                updated_at: true,
                member: {
                  select: {
                    id: true,
                    email: true,
                    created_at: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    name: true,
                    is_builtin: true,
                    created_at: true,
                    updated_at: true,
                    permissions: {
                      select: {
                        id: true,
                        permission_code: true,
                        created_at: true,
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
        },
      },
    } satisfies Prisma.erp_hrm_timelogsFindManyArgs;
  }
  function transformOrganizationMember(
    input: NonNullable<Payload["organizationMember"]>,
  ): IErpHrmOrganizationMember.ISummary {
    const role: IErpHrmRole.ISummary = {
      id: input.role.id,
      name: input.role.name,
      is_builtin: input.role.is_builtin,
      permissions: [],
      created_at: toISOStringSafe(input.role.created_at),
      updated_at: toISOStringSafe(input.role.updated_at),
    };
    role.permissions = input.role.permissions.map(
      (p) =>
        ({
          id: p.id,
          role: role,
          permission_code: p.permission_code,
          created_at: toISOStringSafe(p.created_at),
        }) satisfies IErpHrmRolePermission,
    );
    return {
      id: input.id,
      employment_type: input.employment_type,
      status: input.status,
      position: input.position ?? null,
      member: {
        id: input.member.id,
        email: input.member.email,
        created_at: toISOStringSafe(input.member.created_at),
      },
      role,
      department: input.department
        ? {
            id: input.department.id,
            name: input.department.name,
            description: input.department.description ?? null,
            parent: input.department.parent
              ? {
                  id: input.department.parent.id,
                  name: input.department.parent.name,
                  description: input.department.parent.description ?? null,
                  parent: null,
                  created_at: toISOStringSafe(
                    input.department.parent.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    input.department.parent.updated_at,
                  ),
                }
              : null,
            created_at: toISOStringSafe(input.department.created_at),
            updated_at: toISOStringSafe(input.department.updated_at),
          }
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
  export async function transform(input: Payload): Promise<IErpHrmTimelog> {
    const owner = transformOrganizationMember(input.organizationMember);
    const project: IErpHrmProject.ISummary = {
      id: input.project.id,
      name: input.project.name,
      description: input.project.description ?? null,
      color: input.project.color,
      status: input.project.status,
      budget_hours: input.project.budget_hours ?? null,
      started_at: input.project.started_at?.toISOString() ?? null,
      ended_at: input.project.ended_at?.toISOString() ?? null,
      created_at: toISOStringSafe(input.project.created_at),
      updated_at: toISOStringSafe(input.project.updated_at),
    };
    const task: IErpHrmTask.ISummary | null = input.task
      ? {
          id: input.task.id,
          title: input.task.title,
          status: input.task.status,
          priority: input.task.priority,
          estimatedHours: input.task.estimated_hours ?? null,
          dueDate: input.task.due_date?.toISOString() ?? null,
          assignee: input.task.assignee
            ? transformOrganizationMember(input.task.assignee)
            : null,
          parentId: input.task.parent?.id ?? null,
          created_at: toISOStringSafe(input.task.created_at),
          updated_at: toISOStringSafe(input.task.updated_at),
          deleted_at: input.task.deleted_at?.toISOString() ?? null,
        }
      : null;
    const timesheet: IErpHrmTimesheet.ISummary | null = input.timesheet
      ? {
          id: input.timesheet.id,
          status: input.timesheet.status,
          week_start_date: toISOStringSafe(input.timesheet.week_start_date),
          week_end_date: toISOStringSafe(input.timesheet.week_end_date),
          submitted_at: input.timesheet.submitted_at
            ? toISOStringSafe(input.timesheet.submitted_at)
            : null,
          reviewed_at: input.timesheet.reviewed_at
            ? toISOStringSafe(input.timesheet.reviewed_at)
            : null,
          rejection_reason: input.timesheet.rejection_reason,
          total_hours:
            input.timesheet.timelogs.reduce(
              (sum, t) => sum + t.duration_minutes,
              0,
            ) / 60,
          owner: transformOrganizationMember(input.timesheet.owner),
          reviewer: input.timesheet.reviewer
            ? transformOrganizationMember(input.timesheet.reviewer)
            : null,
          created_at: toISOStringSafe(input.timesheet.created_at),
          updated_at: toISOStringSafe(input.timesheet.updated_at),
        }
      : null;
    return {
      id: input.id,
      owner,
      project,
      task,
      timesheet,
      work_date: toISOStringSafe(input.work_date),
      duration_minutes: input.duration_minutes,
      billable: input.billable,
      description: input.description ?? null,
      locked:
        input.timesheet !== null &&
        input.timesheet !== undefined &&
        input.timesheet.status === "approved",
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
