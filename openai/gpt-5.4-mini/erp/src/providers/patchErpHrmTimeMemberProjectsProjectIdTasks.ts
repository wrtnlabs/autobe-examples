import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTask";
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

export async function patchErpHrmTimeMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTask.IRequest;
}): Promise<IPageIErpHrmTimeTask.ISummary> {
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
      organization: {
        employees: {
          some: {
            erp_hrm_time_member_id: props.member.id,
            deleted_at: null,
          },
        },
      },
    },
    select: {
      id: true,
      erp_hrm_time_organization_id: true,
    },
  });
  const access =
    await MyGlobal.prisma.erp_hrm_time_project_memberships.findFirst({
      where: {
        erp_hrm_time_project_id: project.id,
        deleted_at: null,
        employee: {
          erp_hrm_time_member_id: props.member.id,
          erp_hrm_time_organization_id: project.erp_hrm_time_organization_id,
          deleted_at: null,
        },
      },
      select: {
        id: true,
      },
    });
  if (access === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_tasksWhereInput = {
    erp_hrm_time_project_id: project.id,
    deleted_at: null,
    ...(props.body.search === undefined || props.body.search.length === 0
      ? {}
      : {
          OR: [
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
          ],
        }),
    ...(props.body.status === undefined ? {} : { status: props.body.status }),
    ...(props.body.priority === undefined
      ? {}
      : { priority: props.body.priority }),
    ...(props.body.employeeId === undefined
      ? {}
      : {
          employee: {
            id: props.body.employeeId,
            erp_hrm_time_organization_id: project.erp_hrm_time_organization_id,
            deleted_at: null,
          },
        }),
    ...(props.body.dueDateFrom === undefined &&
    props.body.dueDateTo === undefined
      ? {}
      : {
          due_date: {
            ...(props.body.dueDateFrom === undefined ||
            props.body.dueDateFrom === null
              ? {}
              : { gte: props.body.dueDateFrom }),
            ...(props.body.dueDateTo === undefined ||
            props.body.dueDateTo === null
              ? {}
              : { lte: props.body.dueDateTo }),
          },
        }),
  };
  const orderBy: Prisma.erp_hrm_time_tasksOrderByWithRelationInput =
    props.body.sort === "priority"
      ? { priority: props.body.order === "asc" ? "asc" : "desc" }
      : props.body.sort === "dueDate"
        ? { due_date: props.body.order === "asc" ? "asc" : "desc" }
        : props.body.sort === "createdAt"
          ? { created_at: props.body.order === "asc" ? "asc" : "desc" }
          : { created_at: "desc" };
  const data = await MyGlobal.prisma.erp_hrm_time_tasks.findMany({
    where,
    skip,
    take: limit,
    orderBy,
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
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          color_code: true,
          status: true,
          budget_hours: true,
          start_date: true,
          end_date: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          organization: {
            select: {
              id: true,
            },
          },
        },
      },
      employee: {
        select: {
          id: true,
          erp_hrm_time_organization_id: true,
          erp_hrm_time_member_id: true,
          erp_hrm_time_role_id: true,
          erp_hrm_time_department_id: true,
          position_title: true,
          employment_type: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          organization: {
            select: {
              id: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              is_builtin: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
      parentTask: {
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
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              color_code: true,
              status: true,
              budget_hours: true,
              start_date: true,
              end_date: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              organization: {
                select: {
                  id: true,
                },
              },
            },
          },
          employee: {
            select: {
              id: true,
              erp_hrm_time_organization_id: true,
              erp_hrm_time_member_id: true,
              erp_hrm_time_role_id: true,
              erp_hrm_time_department_id: true,
              position_title: true,
              employment_type: true,
              status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              organization: {
                select: {
                  id: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  is_builtin: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
          parentTask: {
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
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.erp_hrm_time_tasks.count({ where });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(data, async (task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      estimatedHours: task.estimated_hours,
      dueDate: task.due_date === null ? null : task.due_date.toISOString(),
      project: {
        id: task.project.id,
        name: task.project.name,
        description: task.project.description,
        colorCode: task.project.color_code,
        status: task.project.status,
        budgetHours: task.project.budget_hours,
        startDate:
          task.project.start_date === null
            ? null
            : task.project.start_date.toISOString(),
        endDate:
          task.project.end_date === null
            ? null
            : task.project.end_date.toISOString(),
        organization: {
          id: task.project.organization.id,
        },
        createdAt: task.project.created_at.toISOString(),
        updatedAt: task.project.updated_at.toISOString(),
        deletedAt:
          task.project.deleted_at === null
            ? null
            : task.project.deleted_at.toISOString(),
      } satisfies IErpHrmTimeProject.ISummary,
      employee:
        task.employee === null
          ? null
          : ({
              id: task.employee.id,
              organization: {
                id: task.employee.organization.id,
              },
              member: {},
              role: {
                id: task.employee.role.id,
                name: task.employee.role.name,
                description: task.employee.role.description,
                isBuiltin: task.employee.role.is_builtin,
                createdAt: task.employee.role.created_at.toISOString(),
                updatedAt: task.employee.role.updated_at.toISOString(),
                deletedAt:
                  task.employee.role.deleted_at === null
                    ? null
                    : task.employee.role.deleted_at.toISOString(),
                organization: {
                  id: task.employee.organization.id,
                },
              },
              department:
                task.employee.department === null
                  ? null
                  : {
                      id: task.employee.department.id,
                      name: task.employee.department.name,
                      description: task.employee.department.description,
                      organization: {
                        id: task.employee.organization.id,
                      },
                      parentDepartment: null,
                      createdAt:
                        task.employee.department.created_at.toISOString(),
                      updatedAt:
                        task.employee.department.updated_at.toISOString(),
                      deletedAt:
                        task.employee.department.deleted_at === null
                          ? null
                          : task.employee.department.deleted_at.toISOString(),
                    },
              positionTitle: task.employee.position_title,
              employmentType: task.employee.employment_type,
              status: task.employee.status,
              createdAt: task.employee.created_at.toISOString(),
              updatedAt: task.employee.updated_at.toISOString(),
              deletedAt:
                task.employee.deleted_at === null
                  ? null
                  : task.employee.deleted_at.toISOString(),
            } satisfies IErpHrmTimeEmployee.ISummary),
      parentTask:
        task.parentTask === null
          ? null
          : ({
              id: task.parentTask.id,
              title: task.parentTask.title,
              description: task.parentTask.description,
              status: task.parentTask.status,
              priority: task.parentTask.priority,
              estimatedHours: task.parentTask.estimated_hours,
              dueDate:
                task.parentTask.due_date === null
                  ? null
                  : task.parentTask.due_date.toISOString(),
              project: {
                id: task.parentTask.project.id,
                name: task.parentTask.project.name,
                description: task.parentTask.project.description,
                colorCode: task.parentTask.project.color_code,
                status: task.parentTask.project.status,
                budgetHours: task.parentTask.project.budget_hours,
                startDate:
                  task.parentTask.project.start_date === null
                    ? null
                    : task.parentTask.project.start_date.toISOString(),
                endDate:
                  task.parentTask.project.end_date === null
                    ? null
                    : task.parentTask.project.end_date.toISOString(),
                organization: {
                  id: task.parentTask.project.organization.id,
                },
                createdAt: task.parentTask.project.created_at.toISOString(),
                updatedAt: task.parentTask.project.updated_at.toISOString(),
                deletedAt:
                  task.parentTask.project.deleted_at === null
                    ? null
                    : task.parentTask.project.deleted_at.toISOString(),
              } satisfies IErpHrmTimeProject.ISummary,
              employee: null,
              parentTask: null,
              createdAt: task.parentTask.created_at.toISOString(),
              updatedAt: task.parentTask.updated_at.toISOString(),
              deletedAt:
                task.parentTask.deleted_at === null
                  ? null
                  : task.parentTask.deleted_at.toISOString(),
            } satisfies IErpHrmTimeTask.ISummary),
      createdAt: task.created_at.toISOString(),
      updatedAt: task.updated_at.toISOString(),
      deletedAt:
        task.deleted_at === null ? null : task.deleted_at.toISOString(),
    })),
  };
}
