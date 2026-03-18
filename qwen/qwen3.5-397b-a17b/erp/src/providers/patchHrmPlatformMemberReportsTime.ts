import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
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

export async function patchHrmPlatformMemberReportsTime(props: {
  member: MemberPayload;
  body: IHrmPlatformTimeReport.IRequest;
}): Promise<IHrmPlatformTimeReport> {
  const groupBy = props.body.groupBy ?? "employee";
  // Get organization_id through employees table since members don't have organization_id directly
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  const whereInput = {
    employee: {
      organization_id: employee.organization_id,
      deleted_at: null,
    },
    deleted_at: null,
    ...(props.body.startDate && { date: { gte: props.body.startDate } }),
    ...(props.body.endDate && { date: { lte: props.body.endDate } }),
    ...(props.body.employee_id && { employee_id: props.body.employee_id }),
    ...(props.body.project_id && { project_id: props.body.project_id }),
    ...(props.body.task_id && { task_id: props.body.task_id }),
    ...(props.body.billable !== undefined && { billable: props.body.billable }),
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  const aggregated = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    where: whereInput,
    _sum: { duration_minutes: true },
    _count: { id: true },
  });
  const durationSum = aggregated._sum.duration_minutes ?? 0;
  const totalHours = durationSum / 60.0;
  const entryCount = aggregated._count.id;
  const billableAgg = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    where: { ...whereInput, billable: true },
    _sum: { duration_minutes: true },
  });
  const billableHours = (billableAgg._sum.duration_minutes ?? 0) / 60.0;
  const nonBillableHours = totalHours - billableHours;
  let groupValue:
    | IHrmPlatformEmployee.ISummary
    | IHrmPlatformProject.ISummary
    | IHrmPlatformTask.ISummary
    | IHrmPlatformTimeReport.IDateGroup;
  if (groupBy === "employee" && props.body.employee_id) {
    const emp = await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.body.employee_id },
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
    });
    groupValue = {
      id: emp.id,
      display_name: emp.display_name,
      position: emp.position,
      employment_type: emp.employment_type,
      status: emp.status,
      department: emp.department
        ? {
            id: emp.department.id,
            name: emp.department.name,
            description: emp.department.description,
            parent: emp.department.parent
              ? {
                  id: emp.department.parent.id,
                  name: emp.department.parent.name,
                  description: emp.department.parent.description,
                  parent: emp.department.parent.parent
                    ? {
                        id: emp.department.parent.parent.id,
                        name: emp.department.parent.parent.name,
                        description: emp.department.parent.parent.description,
                        parent: null,
                      }
                    : null,
                }
              : null,
          }
        : null,
      role: {
        id: emp.role.id,
        name: emp.role.name,
        built_in: emp.role.built_in,
        created_at: emp.role.created_at.toISOString(),
      },
    } satisfies IHrmPlatformEmployee.ISummary;
  } else if (groupBy === "project" && props.body.project_id) {
    const project =
      await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
        where: { id: props.body.project_id },
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
      });
    const membersCount =
      await MyGlobal.prisma.hrm_platform_project_members.count({
        where: { hrm_platform_project_id: project.id, deleted_at: null },
      });
    groupValue = {
      id: project.id,
      name: project.name,
      color_code: project.color_code,
      status: project.status,
      budget_hours: project.budget_hours ?? null,
      started_at: project.started_at?.toISOString() ?? null,
      ended_at: project.ended_at?.toISOString() ?? null,
      created_at: project.created_at.toISOString(),
      members_count: membersCount,
    } satisfies IHrmPlatformProject.ISummary;
  } else if (groupBy === "task" && props.body.task_id) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.body.task_id },
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
    groupValue = {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      estimated_hours: task.estimated_hours ?? null,
      due_date: task.due_date?.toISOString() ?? null,
      created_at: task.created_at.toISOString(),
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
              created_at: task.assignee.role.created_at.toISOString(),
            },
          }
        : null,
      parent: task.parent
        ? {
            id: task.parent.id,
            title: task.parent.title,
            status: task.parent.status,
            priority: task.parent.priority,
            estimated_hours: task.parent.estimated_hours ?? null,
            due_date: task.parent.due_date?.toISOString() ?? null,
            created_at: task.parent.created_at.toISOString(),
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
                        parent: null,
                      }
                    : null,
                  role: {
                    id: task.parent.assignee.role.id,
                    name: task.parent.assignee.role.name,
                    built_in: task.parent.assignee.role.built_in,
                    created_at:
                      task.parent.assignee.role.created_at.toISOString(),
                  },
                }
              : null,
            parent: task.parent.parent
              ? {
                  id: task.parent.parent.id,
                  title: task.parent.parent.title,
                  status: task.parent.parent.status,
                  priority: task.parent.parent.priority,
                  estimated_hours: task.parent.parent.estimated_hours ?? null,
                  due_date: task.parent.parent.due_date?.toISOString() ?? null,
                  created_at: task.parent.parent.created_at.toISOString(),
                  assignee: null,
                  parent: null,
                }
              : null,
          }
        : null,
    } satisfies IHrmPlatformTask.ISummary;
  } else if (groupBy === "date") {
    const startDate = props.body.startDate ?? new Date().toISOString();
    groupValue = {
      date: startDate.split("T")[0],
    } satisfies IHrmPlatformTimeReport.IDateGroup;
  } else {
    throw new HttpException("Invalid group configuration", 400);
  }
  return {
    groupType: groupBy,
    groupValue,
    totalHours,
    billableHours,
    nonBillableHours,
    entryCount: entryCount,
  };
}
