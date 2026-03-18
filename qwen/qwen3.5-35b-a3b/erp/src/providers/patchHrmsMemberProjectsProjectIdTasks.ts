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
  // Fetch project with validation
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      hrms_organization_id: true,
    },
  });
  // Build WHERE clause for task query
  const whereInput: Prisma.hrms_tasksWhereInput = {
    hrms_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.status &&
      props.body.status.length > 0 && {
        status: { in: props.body.status },
      }),
    ...(props.body.priority &&
      props.body.priority.length > 0 && {
        priority: { in: props.body.priority },
      }),
    ...(props.body.employeeIds &&
      props.body.employeeIds.length > 0 && {
        hrms_employee_id: { in: props.body.employeeIds },
      }),
    ...(props.body.withAssignment !== undefined && {
      hrms_employee_id: props.body.withAssignment ? { not: null } : null,
    }),
    ...(props.body.parentTaskFilter === "parent" && {
      hrms_task_id: null,
    }),
    ...(props.body.parentTaskFilter === "subtask" && {
      hrms_task_id: { not: null },
    }),
    ...(props.body.dueDateFrom && {
      due_date: { gte: new Date(props.body.dueDateFrom) },
    }),
    ...(props.body.dueDateTo && {
      due_date: { lte: new Date(props.body.dueDateTo) },
    }),
    ...(props.body.createdDateFrom && {
      created_at: { gte: new Date(props.body.createdDateFrom) },
    }),
    ...(props.body.createdDateTo && {
      created_at: { lte: new Date(props.body.createdDateTo) },
    }),
  } satisfies Prisma.hrms_tasksWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query tasks
  const tasks = await MyGlobal.prisma.hrms_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.hrms_tasks.count({
    where: whereInput,
  });
  // Build response data - map tasks to IHrmsTask.ISummary format
  const data = tasks.map((task) => ({
    project_id: task.hrms_project_id,
    project_name: project.name,
    task_count: 1,
  }));
  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages,
    },
    data: data,
  } satisfies IPageIHrmsTask.ISummary;
}
