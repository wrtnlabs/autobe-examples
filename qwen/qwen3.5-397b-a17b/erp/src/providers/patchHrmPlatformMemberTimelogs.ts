import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
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

export async function patchHrmPlatformMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmPlatformTimelog.IRequest;
}): Promise<IPageIHrmPlatformTimelog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const whereInput: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    employee_id: employee.id,
    ...(props.body.dateFrom && {
      date: { gte: new Date(props.body.dateFrom) },
    }),
    ...(props.body.dateTo && {
      date: { lte: new Date(props.body.dateTo) },
    }),
    ...(props.body.projectId && {
      project_id: props.body.projectId,
    }),
    ...(props.body.taskId !== undefined && {
      task_id: props.body.taskId,
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereInput,
    select: {
      id: true,
      employee: {
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
                  parent: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                    },
                  },
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
      } satisfies Prisma.hrm_platform_employeesFindManyArgs,
      project: {
        select: {
          id: true,
          name: true,
          color_code: true,
          status: true,
          budget_hours: true,
          started_at: true,
          ended_at: true,
          created_at: true,
        },
      } satisfies Prisma.hrm_platform_projectsFindManyArgs,
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          estimated_hours: true,
          due_date: true,
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
              parent_id: true,
              created_at: true,
            },
          },
          created_at: true,
        },
      } satisfies Prisma.hrm_platform_tasksFindManyArgs,
      date: true,
      duration_minutes: true,
      billable: true,
      description: true,
    },
    skip,
    take: limit,
    orderBy: [{ date: "desc" }, { created_at: "desc" }],
  });
  const total = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: whereInput,
  });
  const transformEmployeeSummary = (
    emp: (typeof data)[number]["employee"],
  ): IHrmPlatformEmployee.ISummary => ({
    id: emp.id as string & tags.Format<"uuid">,
    display_name: emp.display_name,
    position: emp.position,
    employment_type: emp.employment_type,
    status: emp.status,
    department: emp.department
      ? ({
          id: emp.department.id as string & tags.Format<"uuid">,
          name: emp.department.name,
          description: emp.department.description,
          parent: emp.department.parent
            ? ({
                id: emp.department.parent.id as string & tags.Format<"uuid">,
                name: emp.department.parent.name,
                description: emp.department.parent.description,
                parent: emp.department.parent.parent
                  ? ({
                      id: emp.department.parent.parent.id as string &
                        tags.Format<"uuid">,
                      name: emp.department.parent.parent.name,
                      description: emp.department.parent.parent.description,
                      parent: null,
                    } satisfies IHrmPlatformDepartment.ISummary)
                  : null,
              } satisfies IHrmPlatformDepartment.ISummary)
            : null,
        } satisfies IHrmPlatformDepartment.ISummary)
      : null,
    role: {
      id: emp.role.id as string & tags.Format<"uuid">,
      name: emp.role.name,
      built_in: emp.role.built_in,
      created_at: toISOStringSafe(emp.role.created_at) as string &
        tags.Format<"date-time">,
    } satisfies IHrmPlatformRole.ISummary,
  });
  const transformTaskSummary = (
    task: (typeof data)[number]["task"],
  ): IHrmPlatformTask.ISummary | null =>
    task
      ? {
          id: task.id as string & tags.Format<"uuid">,
          title: task.title,
          status: task.status,
          priority: task.priority,
          estimated_hours: task.estimated_hours,
          due_date: (task.due_date ? toISOStringSafe(task.due_date) : null) as
            | (string & tags.Format<"date-time">)
            | null,
          assignee: task.assignee
            ? transformEmployeeSummary(task.assignee)
            : null,
          parent: task.parent
            ? ({
                id: task.parent.id as string & tags.Format<"uuid">,
                title: task.parent.title,
                status: task.parent.status,
                priority: task.parent.priority,
                estimated_hours: task.parent.estimated_hours,
                due_date: (task.parent.due_date
                  ? toISOStringSafe(task.parent.due_date)
                  : null) as (string & tags.Format<"date-time">) | null,
                assignee: task.parent.assignee
                  ? transformEmployeeSummary(task.parent.assignee)
                  : null,
                parent: null,
                created_at: toISOStringSafe(task.parent.created_at) as string &
                  tags.Format<"date-time">,
              } satisfies IHrmPlatformTask.ISummary)
            : null,
          created_at: toISOStringSafe(task.created_at) as string &
            tags.Format<"date-time">,
        }
      : null;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (timelog): IHrmPlatformTimelog.ISummary => ({
        id: timelog.id as string & tags.Format<"uuid">,
        employee: transformEmployeeSummary(timelog.employee),
        project: {
          id: timelog.project.id as string & tags.Format<"uuid">,
          name: timelog.project.name,
          color_code: timelog.project.color_code,
          status: timelog.project.status,
          budget_hours: timelog.project.budget_hours ?? null,
          started_at: (timelog.project.started_at
            ? toISOStringSafe(timelog.project.started_at)
            : null) as (string & tags.Format<"date-time">) | null,
          ended_at: (timelog.project.ended_at
            ? toISOStringSafe(timelog.project.ended_at)
            : null) as (string & tags.Format<"date-time">) | null,
          created_at: toISOStringSafe(timelog.project.created_at) as string &
            tags.Format<"date-time">,
          members_count: 0,
        } satisfies IHrmPlatformProject.ISummary,
        task: transformTaskSummary(timelog.task),
        date: toISOStringSafe(timelog.date) as string &
          tags.Format<"date-time">,
        duration_minutes: timelog.duration_minutes,
        billable: timelog.billable,
        description: timelog.description ?? null,
      }),
    ),
  };
}
