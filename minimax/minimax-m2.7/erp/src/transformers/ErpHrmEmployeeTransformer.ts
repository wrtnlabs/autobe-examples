import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmContractTransformer } from "./ErpHrmContractTransformer";
import { ErpHrmDepartmentAtSummaryTransformer } from "./ErpHrmDepartmentAtSummaryTransformer";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";
import { ErpHrmTimerAtSummaryTransformer } from "./ErpHrmTimerAtSummaryTransformer";
import { ErpHrmTimesheetAtSummaryTransformer } from "./ErpHrmTimesheetAtSummaryTransformer";

export namespace ErpHrmEmployeeTransformer {
  export type Payload = Prisma.erp_hrm_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: ErpHrmMemberAtSummaryTransformer.select(),
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        role: ErpHrmRoleAtSummaryTransformer.select(),
        department: ErpHrmDepartmentAtSummaryTransformer.select(),
        contracts: ErpHrmContractTransformer.select(),
        projectMemberships: {
          select: {
            id: true,
            assigned_role: true,
            created_at: true,
            employee: {
              select: {
                id: true,
                position: true,
                employment_type: true,
                status: true,
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
                        created_at: true,
                        owner: {
                          select: {
                            id: true,
                            email: true,
                            display_name: true,
                            phone: true,
                            avatar_uri: true,
                            created_at: true,
                            deleted_at: true,
                          },
                        },
                      },
                    },
                    rolePermissions: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
                member: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    phone: true,
                    avatar_uri: true,
                    created_at: true,
                    deleted_at: true,
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
                    description: true,
                    logo_uri: true,
                    currency: true,
                    timezone: true,
                    created_at: true,
                    owner: {
                      select: {
                        id: true,
                        email: true,
                        display_name: true,
                        phone: true,
                        avatar_uri: true,
                        created_at: true,
                        deleted_at: true,
                      },
                    },
                  },
                },
              },
            },
          },
        } satisfies Prisma.erp_hrm_project_membersFindManyArgs,
        assignedTasks: ErpHrmTaskAtSummaryTransformer.select(),
        timelogs: {
          select: {
            id: true,
            date: true,
            duration_minutes: true,
            description: true,
            billable: true,
            created_at: true,
            employee: {
              select: {
                id: true,
                position: true,
                employment_type: true,
                status: true,
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
                        created_at: true,
                        owner: {
                          select: {
                            id: true,
                            email: true,
                            display_name: true,
                            phone: true,
                            avatar_uri: true,
                            created_at: true,
                            deleted_at: true,
                          },
                        },
                      },
                    },
                    rolePermissions: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
                member: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    phone: true,
                    avatar_uri: true,
                    created_at: true,
                    deleted_at: true,
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
                    description: true,
                    logo_uri: true,
                    currency: true,
                    timezone: true,
                    created_at: true,
                    owner: {
                      select: {
                        id: true,
                        email: true,
                        display_name: true,
                        phone: true,
                        avatar_uri: true,
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
                        email: true,
                        display_name: true,
                        phone: true,
                        avatar_uri: true,
                        created_at: true,
                        deleted_at: true,
                      },
                    },
                  },
                },
              },
            },
          },
        } satisfies Prisma.erp_hrm_timelogsFindManyArgs,
        timesheets: ErpHrmTimesheetAtSummaryTransformer.select(),
        reviewedTimesheets: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_timesheetsFindManyArgs,
        timers: ErpHrmTimerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_employeesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmEmployee> {
    return {
      id: input.id,
      position: input.position ?? undefined,
      employmentType: input.employment_type as
        | "full-time"
        | "part-time"
        | "contractor"
        | "intern",
      status: input.status as "active" | "deactivated",
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department)
        : undefined,
      contracts: await ArrayUtil.asyncMap(
        input.contracts,
        ErpHrmContractTransformer.transform,
      ),
      projectMemberships: input.projectMemberships.map(
        (pm) =>
          ({
            id: pm.id,
            assignedRole: pm.assigned_role as "member" | "project_lead",
            createdAt: toISOStringSafe(pm.created_at),
            employee: {
              id: pm.employee.id,
              position: pm.employee.position ?? undefined,
              employmentType: pm.employee.employment_type as
                | "full-time"
                | "part-time"
                | "contractor"
                | "intern",
              status: pm.employee.status as "active" | "deactivated",
              role: {
                id: pm.employee.role.id,
                name: pm.employee.role.name,
                isBuiltin: pm.employee.role.is_builtin,
                createdAt: toISOStringSafe(pm.employee.role.created_at),
                organization: {
                  id: pm.employee.role.organization.id,
                  name: pm.employee.role.organization.name,
                  description: pm.employee.role.organization.description,
                  logoUri: pm.employee.role.organization.logo_uri,
                  currency: pm.employee.role.organization.currency,
                  timezone: pm.employee.role.organization.timezone,
                  created_at: toISOStringSafe(
                    pm.employee.role.organization.created_at,
                  ),
                  owner: {
                    id: pm.employee.role.organization.owner.id,
                    email: pm.employee.role.organization.owner.email,
                    displayName:
                      pm.employee.role.organization.owner.display_name,
                    phone: pm.employee.role.organization.owner.phone,
                    avatarUri: pm.employee.role.organization.owner.avatar_uri,
                    createdAt: toISOStringSafe(
                      pm.employee.role.organization.owner.created_at,
                    ),
                    deletedAt: pm.employee.role.organization.owner.deleted_at
                      ? toISOStringSafe(
                          pm.employee.role.organization.owner.deleted_at,
                        )
                      : undefined,
                  },
                },
                permissionsCount: pm.employee.role.rolePermissions
                  .length as number & tags.Type<"int32">,
              },
              member: {
                id: pm.employee.member.id,
                email: pm.employee.member.email,
                displayName: pm.employee.member.display_name,
                phone: pm.employee.member.phone ?? undefined,
                avatarUri: pm.employee.member.avatar_uri ?? undefined,
                createdAt: toISOStringSafe(pm.employee.member.created_at),
                deletedAt: pm.employee.member.deleted_at
                  ? toISOStringSafe(pm.employee.member.deleted_at)
                  : undefined,
              },
            },
            project: {
              id: pm.project.id,
              name: pm.project.name,
              color: pm.project.color,
              status: pm.project.status,
              budgetHours: pm.project.budget_hours,
              createdAt: toISOStringSafe(pm.project.created_at),
              organization: {
                id: pm.project.organization.id,
                name: pm.project.organization.name,
                description: pm.project.organization.description,
                logoUri: pm.project.organization.logo_uri,
                currency: pm.project.organization.currency,
                timezone: pm.project.organization.timezone,
                created_at: toISOStringSafe(pm.project.organization.created_at),
                owner: {
                  id: pm.project.organization.owner.id,
                  email: pm.project.organization.owner.email,
                  displayName: pm.project.organization.owner.display_name,
                  phone: pm.project.organization.owner.phone,
                  avatarUri: pm.project.organization.owner.avatar_uri,
                  createdAt: toISOStringSafe(
                    pm.project.organization.owner.created_at,
                  ),
                  deletedAt: pm.project.organization.owner.deleted_at
                    ? toISOStringSafe(pm.project.organization.owner.deleted_at)
                    : undefined,
                },
              },
              totalTimelogsCount: 0,
            },
            totalCount: 0,
            memberCount: 0,
            projectLeadCount: 0,
            members: [],
          }) as IErpHrmProjectMember.ISummary,
      ),
      assignedTasks: await ArrayUtil.asyncMap(
        input.assignedTasks,
        ErpHrmTaskAtSummaryTransformer.transform,
      ),
      timelogs: input.timelogs.map(
        (tl) =>
          ({
            groupBy: "employee" as const,
            totalMinutes: tl.duration_minutes,
            billableMinutes: tl.billable ? tl.duration_minutes : 0,
            nonBillableMinutes: tl.billable ? 0 : tl.duration_minutes,
            timelogCount: 1,
            employee: {
              id: tl.employee.id,
              position: tl.employee.position ?? undefined,
              employmentType: tl.employee.employment_type as
                | "full-time"
                | "part-time"
                | "contractor"
                | "intern",
              status: tl.employee.status as "active" | "deactivated",
              role: {
                id: tl.employee.role.id,
                name: tl.employee.role.name,
                isBuiltin: tl.employee.role.is_builtin,
                createdAt: toISOStringSafe(tl.employee.role.created_at),
                organization: {
                  id: tl.employee.role.organization.id,
                  name: tl.employee.role.organization.name,
                  description: tl.employee.role.organization.description,
                  logoUri: tl.employee.role.organization.logo_uri,
                  currency: tl.employee.role.organization.currency,
                  timezone: tl.employee.role.organization.timezone,
                  created_at: toISOStringSafe(
                    tl.employee.role.organization.created_at,
                  ),
                  owner: {
                    id: tl.employee.role.organization.owner.id,
                    email: tl.employee.role.organization.owner.email,
                    displayName:
                      tl.employee.role.organization.owner.display_name,
                    phone: tl.employee.role.organization.owner.phone,
                    avatarUri: tl.employee.role.organization.owner.avatar_uri,
                    createdAt: toISOStringSafe(
                      tl.employee.role.organization.owner.created_at,
                    ),
                    deletedAt: tl.employee.role.organization.owner.deleted_at
                      ? toISOStringSafe(
                          tl.employee.role.organization.owner.deleted_at,
                        )
                      : undefined,
                  },
                },
                permissionsCount: tl.employee.role.rolePermissions
                  .length as number & tags.Type<"int32">,
              },
              member: {
                id: tl.employee.member.id,
                email: tl.employee.member.email,
                displayName: tl.employee.member.display_name,
                phone: tl.employee.member.phone ?? undefined,
                avatarUri: tl.employee.member.avatar_uri ?? undefined,
                createdAt: toISOStringSafe(tl.employee.member.created_at),
                deletedAt: tl.employee.member.deleted_at
                  ? toISOStringSafe(tl.employee.member.deleted_at)
                  : undefined,
              },
            },
            project: {
              id: tl.project.id,
              name: tl.project.name,
              color: tl.project.color,
              status: tl.project.status,
              budgetHours: tl.project.budget_hours,
              createdAt: toISOStringSafe(tl.project.created_at),
              organization: {
                id: tl.project.organization.id,
                name: tl.project.organization.name,
                description: tl.project.organization.description,
                logoUri: tl.project.organization.logo_uri,
                currency: tl.project.organization.currency,
                timezone: tl.project.organization.timezone,
                created_at: toISOStringSafe(tl.project.organization.created_at),
                owner: {
                  id: tl.project.organization.owner.id,
                  email: tl.project.organization.owner.email,
                  displayName: tl.project.organization.owner.display_name,
                  phone: tl.project.organization.owner.phone,
                  avatarUri: tl.project.organization.owner.avatar_uri,
                  createdAt: toISOStringSafe(
                    tl.project.organization.owner.created_at,
                  ),
                  deletedAt: tl.project.organization.owner.deleted_at
                    ? toISOStringSafe(tl.project.organization.owner.deleted_at)
                    : undefined,
                },
              },
              totalTimelogsCount: 0,
            },
            task: tl.task
              ? {
                  id: tl.task.id,
                  title: tl.task.title,
                  status: tl.task.status,
                  priority: tl.task.priority,
                  dueDate: tl.task.due_date
                    ? toISOStringSafe(tl.task.due_date)
                    : undefined,
                  created_at: toISOStringSafe(tl.task.created_at),
                  assignee: tl.task.assignee
                    ? {
                        id: tl.task.assignee.id,
                        position: tl.task.assignee.position ?? undefined,
                        employmentType: tl.task.assignee.employment_type as
                          | "full-time"
                          | "part-time"
                          | "contractor"
                          | "intern",
                        status: tl.task.assignee.status as
                          | "active"
                          | "deactivated",
                        member: {
                          id: tl.task.assignee.member.id,
                          email: tl.task.assignee.member.email,
                          displayName: tl.task.assignee.member.display_name,
                          phone: tl.task.assignee.member.phone ?? undefined,
                          avatarUri:
                            tl.task.assignee.member.avatar_uri ?? undefined,
                          createdAt: toISOStringSafe(
                            tl.task.assignee.member.created_at,
                          ),
                          deletedAt: tl.task.assignee.member.deleted_at
                            ? toISOStringSafe(
                                tl.task.assignee.member.deleted_at,
                              )
                            : undefined,
                        },
                      }
                    : undefined,
                }
              : undefined,
          }) as IErpHrmTimelog.ISummary,
      ),
      timesheets: await ArrayUtil.asyncMap(
        input.timesheets,
        ErpHrmTimesheetAtSummaryTransformer.transform,
      ),
      timers: await ArrayUtil.asyncMap(
        input.timers,
        ErpHrmTimerAtSummaryTransformer.transform,
      ),
    } satisfies IErpHrmEmployee;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmEmployeeTransformer {
//       export type Payload = Prisma.erp_hrm_employeesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             position: true,
//             employment_type: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: ErpHrmMemberAtSummaryTransformer.select(),
//             organization: ErpHrmOrganizationAtSummaryTransformer.select(),
//             role: ErpHrmRoleAtSummaryTransformer.select(),
//             department: ErpHrmDepartmentAtSummaryTransformer.select(),
//             contracts: ErpHrmContractTransformer.select(),
//             timers: ErpHrmTimerAtSummaryTransformer.select(),
//             assignedTasks: ErpHrmTaskAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.erp_hrm_employeesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmEmployee> {
//         return {
//   id: {string},
//   position: {string},
//   employmentType: {"full-time" | "part-time" | "contractor" | "intern"},
//   status: {"active" | "deactivated"},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
//   organization: await ErpHrmOrganizationAtSummaryTransformer.transform(input.organization),
//   role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
//   department: await ErpHrmDepartmentAtSummaryTransformer.transform(input.department),
//   contracts: await ArrayUtil.asyncMap(input.contracts, ErpHrmContractTransformer.transform),
//   projectMemberships: {Array<IErpHrmProjectMember.ISummary>},
//   assignedTasks: await ArrayUtil.asyncMap(input.assignedTasks, ErpHrmTaskAtSummaryTransformer.transform),
//   timelogs: {Array<IErpHrmTimelog.ISummary>},
//   timesheets: {Array<IErpHrmTimesheet.ISummary>},
//   timers: await ArrayUtil.asyncMap(input.timers, ErpHrmTimerAtSummaryTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------