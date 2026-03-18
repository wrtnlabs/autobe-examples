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

export async function patchHrmsMemberTasks(props: {
  member: MemberPayload;
  body: IHrmsTask.IRequest;
}): Promise<IPageIHrmsTask.ISummary> {
  // Get organization from member's organization member record
  const orgMember = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      id: props.member.session_id,
    },
    select: { hrms_organization_id: true },
  });
  if (!orgMember) {
    throw new HttpException("Organization not found", 404);
  }
  // Build where conditions with organization context through project
  const where: Prisma.hrms_tasksWhereInput = {
    deleted_at: null,
    project: {
      hrms_organization_id: orgMember.hrms_organization_id,
    },
    ...(props.body.status && { status: { in: props.body.status } }),
    ...(props.body.priority && { priority: { in: props.body.priority } }),
    ...(props.body.projectIds && {
      hrms_project_id: { in: props.body.projectIds },
    }),
    ...(props.body.employeeIds && {
      hrms_employee_id: { in: props.body.employeeIds },
    }),
    ...(props.body.createdDateFrom && {
      created_at: { gte: props.body.createdDateFrom },
    }),
    ...(props.body.createdDateTo && {
      created_at: { lte: props.body.createdDateTo },
    }),
    ...(props.body.dueDateFrom && {
      due_date: { gte: props.body.dueDateFrom },
    }),
    ...(props.body.dueDateTo && {
      due_date: { lte: props.body.dueDateTo },
    }),
  };
  // Handle assignment filter
  if (props.body.withAssignment !== undefined) {
    if (props.body.withAssignment) {
      where.hrms_employee_id = { not: null };
    } else {
      where.hrms_employee_id = null;
    }
  }
  // Handle parent task filter
  if (props.body.parentTaskFilter === "parent") {
    where.hrms_task_id = null;
  } else if (props.body.parentTaskFilter === "subtask") {
    where.hrms_task_id = { not: null };
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get total count
  const total = await MyGlobal.prisma.hrms_tasks.count({
    where,
  });
  // Get tasks with joins
  const tasks = await MyGlobal.prisma.hrms_tasks.findMany({
    where,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      billable: true,
      created_at: true,
      updated_at: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      assignedEmployee: {
        select: {
          id: true,
          display_name: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });
  // Transform to response format
  const data = tasks.map((task) => ({
    id: task.id as string & tags.Format<"uuid">,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    estimated_hours: task.estimated_hours ?? null,
    due_date: task.due_date ? toISOStringSafe(task.due_date) : null,
    billable: task.billable ?? null,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    project_id: task.project.id as string & tags.Format<"uuid">,
    project_name: task.project.name,
    employee_id: task.assignedEmployee?.id as string & tags.Format<"uuid">,
    employee_name: task.assignedEmployee?.display_name ?? null,
    task_count: total,
  })) satisfies IHrmsTask.ISummary[];
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmsTask.ISummary;
}
