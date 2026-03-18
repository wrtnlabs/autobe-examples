import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
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

export async function patchHrmPlatformMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IRequest;
}): Promise<IPageIHrmPlatformTask.ISummary> {
  // Verify project exists and user is a member
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        employee: {
          hrm_platform_user_id: props.member.id,
          deleted_at: null,
        },
        deleted_at: null,
      },
    });
  if (projectMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause
  const whereInput: Prisma.hrm_platform_tasksWhereInput = {
    hrm_platform_projects_id: props.projectId,
    deleted_at: null,
  };
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.priority !== undefined) {
    whereInput.priority = props.body.priority;
  }
  if (props.body.hrm_platform_employees_id !== undefined) {
    whereInput.hrm_platform_employees_id = props.body.hrm_platform_employees_id;
  }
  if (props.body.search !== undefined && props.body.search.length > 0) {
    whereInput.OR = [
      {
        title: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    ];
  }
  // Build order by clause
  const sortField = props.body.sort_by ?? "created_at";
  const sortDirection = props.body.sort_direction ?? "desc";
  const orderByInput: Prisma.hrm_platform_tasksOrderByWithRelationInput =
    sortField === "due_date"
      ? { due_date: sortDirection }
      : sortField === "priority"
        ? { priority: sortDirection }
        : { created_at: sortDirection };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Fetch tasks with relations
  const tasks = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
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
          organization: {
            select: {
              id: true,
              name: true,
              description: true,
              logo_url: true,
              currency: true,
              timezone: true,
              fiscal_start_month: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
      assignedEmployee: {
        select: {
          id: true,
          position: true,
          employment_type: true,
          status: true,
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
              parent_department: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          created_at: true,
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
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  logo_url: true,
                  currency: true,
                  timezone: true,
                  fiscal_start_month: true,
                  created_at: true,
                  updated_at: true,
                },
              },
            },
          },
          assignedEmployee: {
            select: {
              id: true,
              position: true,
              employment_type: true,
              status: true,
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
                  parent_department: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  },
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              created_at: true,
            },
          },
        },
      },
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.hrm_platform_tasks.count({
    where: whereInput,
  });
  // Transform to DTO
  const data = tasks.map((task) => ({
    id: task.id as string & tags.Format<"uuid">,
    title: task.title,
    status: task.status,
    priority: task.priority,
    estimated_hours: task.estimated_hours ?? null,
    due_date: task.due_date?.toISOString() ?? null,
    created_at: task.created_at.toISOString(),
    updated_at: task.updated_at.toISOString(),
    deleted_at: task.deleted_at?.toISOString() ?? null,
    project: {
      id: task.project.id as string & tags.Format<"uuid">,
      name: task.project.name,
      color_code: task.project.color_code,
      status: task.project.status,
      budget_hours: task.project.budget_hours ?? null,
      start_date: task.project.start_date?.toISOString() ?? null,
      end_date: task.project.end_date?.toISOString() ?? null,
      organization: {
        id: task.project.organization.id as string & tags.Format<"uuid">,
        name: task.project.organization.name,
        description: task.project.organization.description ?? null,
        logo_url: task.project.organization.logo_url ?? null,
        currency: task.project.organization.currency,
        timezone: task.project.organization.timezone,
        fiscal_start_month: task.project.organization.fiscal_start_month,
        created_at: task.project.organization.created_at.toISOString(),
        updated_at: task.project.organization.updated_at.toISOString(),
      },
    },
    assignedEmployee: task.assignedEmployee
      ? {
          id: task.assignedEmployee.id as string & tags.Format<"uuid">,
          position: task.assignedEmployee.position ?? null,
          employment_type: task.assignedEmployee.employment_type,
          status: task.assignedEmployee.status,
          user: {
            id: task.assignedEmployee.user.id as string & tags.Format<"uuid">,
            email: task.assignedEmployee.user.email,
            display_name: task.assignedEmployee.user.display_name,
            avatar_image: task.assignedEmployee.user.avatar_image ?? null,
            phone_number: task.assignedEmployee.user.phone_number ?? null,
          },
          role: {
            id: task.assignedEmployee.role.id as string & tags.Format<"uuid">,
            code: task.assignedEmployee.role.code,
            name: task.assignedEmployee.role.name,
            description: task.assignedEmployee.role.description ?? null,
            is_builtin: task.assignedEmployee.role.is_builtin,
            permissions: [],
            created_at: task.assignedEmployee.role.created_at.toISOString(),
            deleted_at:
              task.assignedEmployee.role.deleted_at?.toISOString() ?? null,
          },
          department: task.assignedEmployee.department
            ? {
                id: task.assignedEmployee.department.id as string &
                  tags.Format<"uuid">,
                name: task.assignedEmployee.department.name,
                description:
                  task.assignedEmployee.department.description ?? null,
                parent_department: task.assignedEmployee.department
                  .parent_department
                  ? {
                      id: task.assignedEmployee.department.parent_department
                        .id as string & tags.Format<"uuid">,
                      name: task.assignedEmployee.department.parent_department
                        .name,
                      description:
                        task.assignedEmployee.department.parent_department
                          .description ?? null,
                      created_at:
                        task.assignedEmployee.department.parent_department.created_at.toISOString(),
                      updated_at:
                        task.assignedEmployee.department.parent_department.updated_at.toISOString(),
                      deleted_at:
                        task.assignedEmployee.department.parent_department.deleted_at?.toISOString() ??
                        null,
                    }
                  : null,
                created_at:
                  task.assignedEmployee.department.created_at.toISOString(),
                updated_at:
                  task.assignedEmployee.department.updated_at.toISOString(),
                deleted_at:
                  task.assignedEmployee.department.deleted_at?.toISOString() ??
                  null,
              }
            : null,
          created_at: task.assignedEmployee.created_at.toISOString(),
        }
      : null,
    parent: task.parent
      ? {
          id: task.parent.id as string & tags.Format<"uuid">,
          title: task.parent.title,
          status: task.parent.status,
          priority: task.parent.priority,
          estimated_hours: task.parent.estimated_hours ?? null,
          due_date: task.parent.due_date?.toISOString() ?? null,
          created_at: task.parent.created_at.toISOString(),
          updated_at: task.parent.updated_at.toISOString(),
          deleted_at: task.parent.deleted_at?.toISOString() ?? null,
          project: {
            id: task.parent.project.id as string & tags.Format<"uuid">,
            name: task.parent.project.name,
            color_code: task.parent.project.color_code,
            status: task.parent.project.status,
            budget_hours: task.parent.project.budget_hours ?? null,
            start_date: task.parent.project.start_date?.toISOString() ?? null,
            end_date: task.parent.project.end_date?.toISOString() ?? null,
            organization: {
              id: task.parent.project.organization.id as string &
                tags.Format<"uuid">,
              name: task.parent.project.organization.name,
              description: task.parent.project.organization.description ?? null,
              logo_url: task.parent.project.organization.logo_url ?? null,
              currency: task.parent.project.organization.currency,
              timezone: task.parent.project.organization.timezone,
              fiscal_start_month:
                task.parent.project.organization.fiscal_start_month,
              created_at:
                task.parent.project.organization.created_at.toISOString(),
              updated_at:
                task.parent.project.organization.updated_at.toISOString(),
            },
          },
          assignedEmployee: task.parent.assignedEmployee
            ? {
                id: task.parent.assignedEmployee.id as string &
                  tags.Format<"uuid">,
                position: task.parent.assignedEmployee.position ?? null,
                employment_type: task.parent.assignedEmployee.employment_type,
                status: task.parent.assignedEmployee.status,
                user: {
                  id: task.parent.assignedEmployee.user.id as string &
                    tags.Format<"uuid">,
                  email: task.parent.assignedEmployee.user.email,
                  display_name: task.parent.assignedEmployee.user.display_name,
                  avatar_image:
                    task.parent.assignedEmployee.user.avatar_image ?? null,
                  phone_number:
                    task.parent.assignedEmployee.user.phone_number ?? null,
                },
                role: {
                  id: task.parent.assignedEmployee.role.id as string &
                    tags.Format<"uuid">,
                  code: task.parent.assignedEmployee.role.code,
                  name: task.parent.assignedEmployee.role.name,
                  description:
                    task.parent.assignedEmployee.role.description ?? null,
                  is_builtin: task.parent.assignedEmployee.role.is_builtin,
                  permissions: [],
                  created_at:
                    task.parent.assignedEmployee.role.created_at.toISOString(),
                  deleted_at:
                    task.parent.assignedEmployee.role.deleted_at?.toISOString() ??
                    null,
                },
                department: task.parent.assignedEmployee.department
                  ? {
                      id: task.parent.assignedEmployee.department.id as string &
                        tags.Format<"uuid">,
                      name: task.parent.assignedEmployee.department.name,
                      description:
                        task.parent.assignedEmployee.department.description ??
                        null,
                      parent_department: task.parent.assignedEmployee.department
                        .parent_department
                        ? {
                            id: task.parent.assignedEmployee.department
                              .parent_department.id as string &
                              tags.Format<"uuid">,
                            name: task.parent.assignedEmployee.department
                              .parent_department.name,
                            description:
                              task.parent.assignedEmployee.department
                                .parent_department.description ?? null,
                            created_at:
                              task.parent.assignedEmployee.department.parent_department.created_at.toISOString(),
                            updated_at:
                              task.parent.assignedEmployee.department.parent_department.updated_at.toISOString(),
                            deleted_at:
                              task.parent.assignedEmployee.department.parent_department.deleted_at?.toISOString() ??
                              null,
                          }
                        : null,
                      created_at:
                        task.parent.assignedEmployee.department.created_at.toISOString(),
                      updated_at:
                        task.parent.assignedEmployee.department.updated_at.toISOString(),
                      deleted_at:
                        task.parent.assignedEmployee.department.deleted_at?.toISOString() ??
                        null,
                    }
                  : null,
                created_at:
                  task.parent.assignedEmployee.created_at.toISOString(),
              }
            : null,
        }
      : null,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
