import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformTaskAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
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
        deleted_at: true,
        project_id: true,
        assigned_employee_id: true,
        parent_task_id: true,
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
            _count: { select: { timelogs: true } },
            timelogs: {
              select: { duration_minutes: true, billable: true },
            } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
          },
        },
        parentTask: undefined,
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
            status: true,
            start_date: true,
            end_date: true,
            is_pending: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
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
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    fiscal_start_month: true,
                    currency: true,
                    timezone: true,
                    description: true,
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
            department: {
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
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    fiscal_start_month: true,
                    currency: true,
                    timezone: true,
                    description: true,
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
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                        fiscal_start_month: true,
                        currency: true,
                        timezone: true,
                        description: true,
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
                    parentDepartment: undefined,
                  },
                },
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                fiscal_start_month: true,
                currency: true,
                timezone: true,
                description: true,
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
        childrenTasks: undefined,
        histories: undefined,
        timers: undefined,
        timelogs: undefined,
      },
    } satisfies Prisma.hrm_platform_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IHrmPlatformTask.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IHrmPlatformTask.ISummary> {
    const assignedEmployee = input.assignedEmployee
      ? {
          id: input.assignedEmployee.id,
          employee_code: input.assignedEmployee.employee_code,
          display_name: input.assignedEmployee.display_name,
          email: input.assignedEmployee.email,
          phone_number: input.assignedEmployee.phone_number,
          job_title: input.assignedEmployee.job_title,
          job_level: input.assignedEmployee.job_level,
          employment_type: input.assignedEmployee.employment_type,
          status: input.assignedEmployee.status,
          start_date: toISOStringSafe(input.assignedEmployee.start_date),
          end_date:
            input.assignedEmployee.end_date !== null
              ? toISOStringSafe(input.assignedEmployee.end_date)
              : null,
          is_pending: input.assignedEmployee.is_pending,
          created_at: toISOStringSafe(input.assignedEmployee.created_at),
          updated_at: toISOStringSafe(input.assignedEmployee.updated_at),
          deleted_at:
            input.assignedEmployee.deleted_at !== null
              ? toISOStringSafe(input.assignedEmployee.deleted_at)
              : null,
          member: {
            id: input.assignedEmployee.member.id,
            email: input.assignedEmployee.member.email,
            display_name:
              input.assignedEmployee.member.display_name ?? undefined,
            avatar_uri: input.assignedEmployee.member.avatar_uri ?? undefined,
            phone_number:
              input.assignedEmployee.member.phone_number ?? undefined,
            is_active: input.assignedEmployee.member.is_active,
            last_login_at:
              input.assignedEmployee.member.last_login_at !== null
                ? toISOStringSafe(input.assignedEmployee.member.last_login_at)
                : null,
            created_at: toISOStringSafe(
              input.assignedEmployee.member.created_at,
            ),
            updated_at: toISOStringSafe(
              input.assignedEmployee.member.updated_at,
            ),
            deleted_at:
              input.assignedEmployee.member.deleted_at !== null
                ? toISOStringSafe(input.assignedEmployee.member.deleted_at)
                : null,
          } satisfies IHrmPlatformMember.ISummary,
          role: {
            id: input.assignedEmployee.role.id,
            name: input.assignedEmployee.role.name,
            role_kind: input.assignedEmployee.role.role_kind,
            permissions_count: 0 as number & tags.Type<"int32">,
            organization: {
              id: input.assignedEmployee.role.organization.id,
              name: input.assignedEmployee.role.organization.name,
              created_at: toISOStringSafe(
                input.assignedEmployee.role.organization.created_at,
              ),
              updated_at: toISOStringSafe(
                input.assignedEmployee.role.organization.updated_at,
              ),
              deleted_at:
                input.assignedEmployee.role.organization.deleted_at !== null
                  ? toISOStringSafe(
                      input.assignedEmployee.role.organization.deleted_at,
                    )
                  : null,
              fiscal_start_month:
                input.assignedEmployee.role.organization.fiscal_start_month,
              currency: input.assignedEmployee.role.organization.currency,
              timezone: input.assignedEmployee.role.organization.timezone,
              description: input.assignedEmployee.role.organization.description,
              owner: {
                id: input.assignedEmployee.role.organization.owner.id,
                email: input.assignedEmployee.role.organization.owner.email,
                display_name:
                  input.assignedEmployee.role.organization.owner.display_name ??
                  undefined,
                avatar_uri:
                  input.assignedEmployee.role.organization.owner.avatar_uri ??
                  undefined,
                phone_number:
                  input.assignedEmployee.role.organization.owner.phone_number ??
                  undefined,
                is_active:
                  input.assignedEmployee.role.organization.owner.is_active,
                last_login_at:
                  input.assignedEmployee.role.organization.owner
                    .last_login_at !== null
                    ? toISOStringSafe(
                        input.assignedEmployee.role.organization.owner
                          .last_login_at,
                      )
                    : null,
                created_at: toISOStringSafe(
                  input.assignedEmployee.role.organization.owner.created_at,
                ),
                updated_at: toISOStringSafe(
                  input.assignedEmployee.role.organization.owner.updated_at,
                ),
                deleted_at:
                  input.assignedEmployee.role.organization.owner.deleted_at !==
                  null
                    ? toISOStringSafe(
                        input.assignedEmployee.role.organization.owner
                          .deleted_at,
                      )
                    : null,
              } satisfies IHrmPlatformMember.ISummary,
            } satisfies IHrmPlatformOrganization.ISummary,
          } satisfies IHrmPlatformRole.ISummary,
          department: input.assignedEmployee.department
            ? ({
                id: input.assignedEmployee.department.id,
                name: input.assignedEmployee.department.name,
                organization: {
                  id: input.assignedEmployee.department.organization.id,
                  name: input.assignedEmployee.department.organization.name,
                  created_at: toISOStringSafe(
                    input.assignedEmployee.department.organization.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    input.assignedEmployee.department.organization.updated_at,
                  ),
                  deleted_at:
                    input.assignedEmployee.department.organization
                      .deleted_at !== null
                      ? toISOStringSafe(
                          input.assignedEmployee.department.organization
                            .deleted_at,
                        )
                      : null,
                  fiscal_start_month:
                    input.assignedEmployee.department.organization
                      .fiscal_start_month,
                  currency:
                    input.assignedEmployee.department.organization.currency,
                  timezone:
                    input.assignedEmployee.department.organization.timezone,
                  description:
                    input.assignedEmployee.department.organization.description,
                  owner: {
                    id: input.assignedEmployee.department.organization.owner.id,
                    email:
                      input.assignedEmployee.department.organization.owner
                        .email,
                    display_name:
                      input.assignedEmployee.department.organization.owner
                        .display_name ?? undefined,
                    avatar_uri:
                      input.assignedEmployee.department.organization.owner
                        .avatar_uri ?? undefined,
                    phone_number:
                      input.assignedEmployee.department.organization.owner
                        .phone_number ?? undefined,
                    is_active:
                      input.assignedEmployee.department.organization.owner
                        .is_active,
                    last_login_at:
                      input.assignedEmployee.department.organization.owner
                        .last_login_at !== null
                        ? toISOStringSafe(
                            input.assignedEmployee.department.organization.owner
                              .last_login_at,
                          )
                        : null,
                    created_at: toISOStringSafe(
                      input.assignedEmployee.department.organization.owner
                        .created_at,
                    ),
                    updated_at: toISOStringSafe(
                      input.assignedEmployee.department.organization.owner
                        .updated_at,
                    ),
                    deleted_at:
                      input.assignedEmployee.department.organization.owner
                        .deleted_at !== null
                        ? toISOStringSafe(
                            input.assignedEmployee.department.organization.owner
                              .deleted_at,
                          )
                        : null,
                  } satisfies IHrmPlatformMember.ISummary,
                } satisfies IHrmPlatformOrganization.ISummary,
                parentDepartment: input.assignedEmployee.department
                  .parentDepartment
                  ? ({
                      id: input.assignedEmployee.department.parentDepartment.id,
                      name: input.assignedEmployee.department.parentDepartment
                        .name,
                      organization: {
                        id: input.assignedEmployee.department.parentDepartment
                          .organization.id,
                        name: input.assignedEmployee.department.parentDepartment
                          .organization.name,
                        created_at: toISOStringSafe(
                          input.assignedEmployee.department.parentDepartment
                            .organization.created_at,
                        ),
                        updated_at: toISOStringSafe(
                          input.assignedEmployee.department.parentDepartment
                            .organization.updated_at,
                        ),
                        deleted_at:
                          input.assignedEmployee.department.parentDepartment
                            .organization.deleted_at !== null
                            ? toISOStringSafe(
                                input.assignedEmployee.department
                                  .parentDepartment.organization.deleted_at,
                              )
                            : null,
                        fiscal_start_month:
                          input.assignedEmployee.department.parentDepartment
                            .organization.fiscal_start_month,
                        currency:
                          input.assignedEmployee.department.parentDepartment
                            .organization.currency,
                        timezone:
                          input.assignedEmployee.department.parentDepartment
                            .organization.timezone,
                        description:
                          input.assignedEmployee.department.parentDepartment
                            .organization.description,
                        owner: {
                          id: input.assignedEmployee.department.parentDepartment
                            .organization.owner.id,
                          email:
                            input.assignedEmployee.department.parentDepartment
                              .organization.owner.email,
                          display_name:
                            input.assignedEmployee.department.parentDepartment
                              .organization.owner.display_name ?? undefined,
                          avatar_uri:
                            input.assignedEmployee.department.parentDepartment
                              .organization.owner.avatar_uri ?? undefined,
                          phone_number:
                            input.assignedEmployee.department.parentDepartment
                              .organization.owner.phone_number ?? undefined,
                          is_active:
                            input.assignedEmployee.department.parentDepartment
                              .organization.owner.is_active,
                          last_login_at:
                            input.assignedEmployee.department.parentDepartment
                              .organization.owner.last_login_at !== null
                              ? toISOStringSafe(
                                  input.assignedEmployee.department
                                    .parentDepartment.organization.owner
                                    .last_login_at,
                                )
                              : null,
                          created_at: toISOStringSafe(
                            input.assignedEmployee.department.parentDepartment
                              .organization.owner.created_at,
                          ),
                          updated_at: toISOStringSafe(
                            input.assignedEmployee.department.parentDepartment
                              .organization.owner.updated_at,
                          ),
                          deleted_at:
                            input.assignedEmployee.department.parentDepartment
                              .organization.owner.deleted_at !== null
                              ? toISOStringSafe(
                                  input.assignedEmployee.department
                                    .parentDepartment.organization.owner
                                    .deleted_at,
                                )
                              : null,
                        } satisfies IHrmPlatformMember.ISummary,
                      } satisfies IHrmPlatformOrganization.ISummary,
                      parentDepartment: null,
                      created_at: toISOStringSafe(
                        input.assignedEmployee.department.parentDepartment
                          .created_at,
                      ),
                      updated_at: toISOStringSafe(
                        input.assignedEmployee.department.parentDepartment
                          .updated_at,
                      ),
                    } satisfies IHrmPlatformDepartment.ISummary)
                  : null,
                created_at: toISOStringSafe(
                  input.assignedEmployee.department.created_at,
                ),
                updated_at: toISOStringSafe(
                  input.assignedEmployee.department.updated_at,
                ),
              } satisfies IHrmPlatformDepartment.ISummary)
            : null,
          organization: {
            id: input.assignedEmployee.organization.id,
            name: input.assignedEmployee.organization.name,
            created_at: toISOStringSafe(
              input.assignedEmployee.organization.created_at,
            ),
            updated_at: toISOStringSafe(
              input.assignedEmployee.organization.updated_at,
            ),
            deleted_at:
              input.assignedEmployee.organization.deleted_at !== null
                ? toISOStringSafe(
                    input.assignedEmployee.organization.deleted_at,
                  )
                : null,
            fiscal_start_month:
              input.assignedEmployee.organization.fiscal_start_month,
            currency: input.assignedEmployee.organization.currency,
            timezone: input.assignedEmployee.organization.timezone,
            description: input.assignedEmployee.organization.description,
            owner: {
              id: input.assignedEmployee.organization.owner.id,
              email: input.assignedEmployee.organization.owner.email,
              display_name:
                input.assignedEmployee.organization.owner.display_name ??
                undefined,
              avatar_uri:
                input.assignedEmployee.organization.owner.avatar_uri ??
                undefined,
              phone_number:
                input.assignedEmployee.organization.owner.phone_number ??
                undefined,
              is_active: input.assignedEmployee.organization.owner.is_active,
              last_login_at:
                input.assignedEmployee.organization.owner.last_login_at !== null
                  ? toISOStringSafe(
                      input.assignedEmployee.organization.owner.last_login_at,
                    )
                  : null,
              created_at: toISOStringSafe(
                input.assignedEmployee.organization.owner.created_at,
              ),
              updated_at: toISOStringSafe(
                input.assignedEmployee.organization.owner.updated_at,
              ),
              deleted_at:
                input.assignedEmployee.organization.owner.deleted_at !== null
                  ? toISOStringSafe(
                      input.assignedEmployee.organization.owner.deleted_at,
                    )
                  : null,
            } satisfies IHrmPlatformMember.ISummary,
          } satisfies IHrmPlatformOrganization.ISummary,
        }
      : null;
    const parentTask = input.parent_task_id
      ? await cache.get(input.parent_task_id)
      : null;
    // Compute project aggregations
    const timelogs = input.project.timelogs;
    const totalHours = timelogs.reduce((sum, t) => sum + t.duration_minutes, 0);
    const billableHours = timelogs
      .filter((t) => t.billable)
      .reduce((sum, t) => sum + t.duration_minutes, 0);
    const nonBillableHours = totalHours - billableHours;
    const budgetUtilization = input.project.budget_hours
      ? Math.min((totalHours / input.project.budget_hours) * 100, 100)
      : null;
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      created_at: toISOStringSafe(input.created_at),
      due_date:
        input.due_date !== null ? toISOStringSafe(input.due_date) : null,
      project: {
        id: input.project.id,
        name: input.project.name,
        status: input.project.status,
        color_code: input.project.color_code,
        budget_hours: input.project.budget_hours,
        start_date:
          input.project.start_date !== null
            ? toISOStringSafe(input.project.start_date)
            : null,
        end_date:
          input.project.end_date !== null
            ? toISOStringSafe(input.project.end_date)
            : null,
        description: input.project.description,
        created_at: toISOStringSafe(input.project.created_at),
        updated_at: toISOStringSafe(input.project.updated_at),
        total_hours: totalHours,
        billable_hours: billableHours,
        non_billable_hours: nonBillableHours,
        timelog_count: input.project._count.timelogs as number &
          tags.Type<"int32">,
        employee_count: 0, // Would need to join with employees if needed
        budget_utilization: budgetUtilization,
      } satisfies IHrmPlatformProject.ISummary,
      assignedEmployee,
      parentTask,
    } satisfies IHrmPlatformTask.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmPlatformTask.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IHrmPlatformTask.ISummary> => {
        const record =
          await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformTaskAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_tasksGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             description: true,
//             status: true,
//             priority: true,
//             estimated_hours: true,
//             due_date: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             project_id: true,
//             assigned_employee_id: true,
//             parent_task_id: true,
//             parentTask: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.hrm_platform_tasksFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IHrmPlatformTask.ISummary>, [string]> = createParentCache(),
//       ): Promise<IHrmPlatformTask.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   status: {string},
//   priority: {string},
//   created_at: {string},
//   due_date: {string | null},
//   project: {IHrmPlatformProject.ISummary},
//   assignedEmployee: {IHrmPlatformEmployee.ISummary | null},
//   parentTask: input.parent_task_id ? await cache.get(input.parent_task_id) : null,
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IHrmPlatformTask.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IHrmPlatformTask.ISummary> => {
//             const record =
//               await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
//                 ...select(),
//                 where: { id },
//               });
//             return transform(record, cache);
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------