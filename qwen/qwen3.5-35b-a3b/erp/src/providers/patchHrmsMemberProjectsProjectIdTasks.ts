import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTaskAnalyticGrouping } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskAnalyticGrouping";
import { IHrmsTaskParentTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskParentTaskFilter";
import { IHrmsTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskPriority";
import { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTask";
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

export async function patchHrmsMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmsTask.IRequest;
}): Promise<IPageIHrmsTask.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const projectMembership =
    await MyGlobal.prisma.hrms_project_members.findFirst({
      where: {
        employee: {
          organizationMember: {
            member: {
              id: props.member.id,
              deleted_at: null,
            },
          },
        },
        project_id: props.projectId,
        status: "active",
      },
    });
  if (!projectMembership) {
    throw new HttpException("Project access denied", 403);
  }
  const whereInput: Prisma.hrms_tasksWhereInput = {
    hrms_project_id: props.projectId,
    deleted_at: null,
  };
  if (props.body.status && props.body.status.length > 0) {
    whereInput.status = { in: props.body.status };
  }
  if (props.body.priority && props.body.priority.length > 0) {
    whereInput.priority = { in: props.body.priority };
  }
  if (props.body.createdDateFrom || props.body.createdDateTo) {
    whereInput.created_at = {
      ...(props.body.createdDateFrom && {
        gte: new Date(props.body.createdDateFrom),
      }),
      ...(props.body.createdDateTo && {
        lte: new Date(props.body.createdDateTo),
      }),
    };
  }
  if (props.body.dueDateFrom || props.body.dueDateTo) {
    whereInput.due_date = {
      ...(props.body.dueDateFrom && { gte: new Date(props.body.dueDateFrom) }),
      ...(props.body.dueDateTo && { lte: new Date(props.body.dueDateTo) }),
    };
  }
  if (props.body.employeeIds && props.body.employeeIds.length > 0) {
    whereInput.hrms_employee_id = { in: props.body.employeeIds };
  }
  if (props.body.withAssignment === true) {
    whereInput.hrms_employee_id = { not: null };
  } else if (props.body.withAssignment === false) {
    whereInput.hrms_employee_id = null;
  }
  if (props.body.parentTaskFilter === "parent") {
    whereInput.hrms_task_id = null;
  } else if (props.body.parentTaskFilter === "subtask") {
    whereInput.hrms_task_id = { not: null };
  }
  if (props.body.projectIds && props.body.projectIds.length > 0) {
    whereInput.hrms_project_id = { in: props.body.projectIds };
  }
  const tasks = await MyGlobal.prisma.hrms_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
    include: {
      assignedEmployee: {
        include: {
          organizationMember: {
            include: {
              member: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrms_tasks.count({ where: whereInput });
  const project = await MyGlobal.prisma.hrms_projects.findUnique({
    where: { id: props.projectId },
    select: { name: true },
  });
  const data = await ArrayUtil.asyncMap(tasks, async (task) => ({
    id: task.id as string & tags.Format<"uuid">,
    project_id: task.hrms_project_id,
    project_name: project?.name ?? "",
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    estimated_hours: task.estimated_hours,
    due_date: task.due_date ? toISOStringSafe(task.due_date) : "",
    billable: task.billable,
    assigned_employee_id: task.hrms_employee_id,
    assigned_employee_name: task.assignedEmployee
      ? `${task.assignedEmployee.display_name}${task.assignedEmployee.organizationMember.member.email}`
      : null,
    parent_task_id: task.hrms_task_id,
    task_count: 1,
    created_at: task.created_at ? toISOStringSafe(task.created_at) : "",
    updated_at: task.updated_at ? toISOStringSafe(task.updated_at) : "",
  }));
  return {
    data: data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
