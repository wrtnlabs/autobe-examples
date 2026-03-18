import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  const membership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
    });
  if (!membership) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput = {
    hrm_platform_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.status &&
      props.body.status.length > 0 && {
        status: { in: props.body.status },
      }),
    ...(props.body.priority &&
      props.body.priority.length > 0 && {
        priority: { in: props.body.priority },
      }),
    ...(props.body.hrm_platform_employee_id && {
      hrm_platform_employee_id: props.body.hrm_platform_employee_id,
    }),
  } satisfies Prisma.hrm_platform_tasksWhereInput;
  const orderByInput = parseSort(
    props.body.sort,
  ) satisfies Prisma.hrm_platform_tasksOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      created_at: true,
      assignee: {
        select: {
          id: true,
          display_name: true,
          position: true,
          employment_type: true,
          status: true,
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              built_in: true,
              created_at: true,
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
          assignee: {
            select: {
              id: true,
              display_name: true,
              position: true,
              employment_type: true,
              status: true,
              department: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  parent: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                    },
                  },
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                  built_in: true,
                  created_at: true,
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
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_tasks.count({
    where: whereInput,
  });
  return {
    data: data.map((task) => {
      const result: IHrmPlatformTask.ISummary = {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        estimated_hours: task.estimated_hours,
        due_date: task.due_date ? toISOStringSafe(task.due_date) : null,
        created_at: toISOStringSafe(task.created_at),
        assignee: task.assignee
          ? {
              id: task.assignee.id,
              display_name: task.assignee.display_name,
              position: task.assignee.position,
              employment_type: task.assignee.employment_type,
              status: task.assignee.status,
              department: task.assignee.department
                ? {
                    id: task.assignee.department.id,
                    name: task.assignee.department.name,
                    description: task.assignee.department.description,
                    parent: task.assignee.department.parent
                      ? {
                          id: task.assignee.department.parent.id,
                          name: task.assignee.department.parent.name,
                          description:
                            task.assignee.department.parent.description,
                          parent: null,
                        }
                      : null,
                  }
                : null,
              role: {
                id: task.assignee.role.id,
                name: task.assignee.role.name,
                built_in: task.assignee.role.built_in,
                created_at: toISOStringSafe(task.assignee.role.created_at),
              },
            }
          : null,
        parent: task.parent
          ? {
              id: task.parent.id,
              title: task.parent.title,
              status: task.parent.status,
              priority: task.parent.priority,
              estimated_hours: task.parent.estimated_hours,
              due_date: task.parent.due_date
                ? toISOStringSafe(task.parent.due_date)
                : null,
              created_at: toISOStringSafe(task.parent.created_at),
              assignee: task.parent.assignee
                ? {
                    id: task.parent.assignee.id,
                    display_name: task.parent.assignee.display_name,
                    position: task.parent.assignee.position,
                    employment_type: task.parent.assignee.employment_type,
                    status: task.parent.assignee.status,
                    department: task.parent.assignee.department
                      ? {
                          id: task.parent.assignee.department.id,
                          name: task.parent.assignee.department.name,
                          description:
                            task.parent.assignee.department.description,
                          parent: task.parent.assignee.department.parent
                            ? {
                                id: task.parent.assignee.department.parent.id,
                                name: task.parent.assignee.department.parent
                                  .name,
                                description:
                                  task.parent.assignee.department.parent
                                    .description,
                                parent: null,
                              }
                            : null,
                        }
                      : null,
                    role: {
                      id: task.parent.assignee.role.id,
                      name: task.parent.assignee.role.name,
                      built_in: task.parent.assignee.role.built_in,
                      created_at: toISOStringSafe(
                        task.parent.assignee.role.created_at,
                      ),
                    },
                  }
                : null,
              parent: task.parent.parent
                ? {
                    id: task.parent.parent.id,
                    title: task.parent.parent.title,
                    status: task.parent.parent.status,
                    priority: task.parent.parent.priority,
                    estimated_hours: task.parent.parent.estimated_hours,
                    due_date: task.parent.parent.due_date
                      ? toISOStringSafe(task.parent.parent.due_date)
                      : null,
                    created_at: toISOStringSafe(task.parent.parent.created_at),
                    assignee: null,
                    parent: null,
                  }
                : null,
            }
          : null,
      };
      return result;
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
function parseSort(
  sort?: string,
): Prisma.hrm_platform_tasksOrderByWithRelationInput {
  if (!sort) {
    return {};
  }
  const parts = sort.split(",");
  const orderBy: Prisma.hrm_platform_tasksOrderByWithRelationInput = {};
  for (const part of parts) {
    const [field, direction] = part.trim().split(":");
    const order = direction === "desc" ? "desc" : "asc";
    if (field === "due_date") {
      orderBy.due_date = order;
    } else if (field === "priority") {
      orderBy.priority = order;
    } else if (field === "created_at") {
      orderBy.created_at = order;
    }
  }
  return orderBy;
}
