import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTaskAnalyticGrouping } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskAnalyticGrouping";
import { IHrmsTaskParentTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskParentTaskFilter";
import { IHrmsTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskPriority";
import { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
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

export async function patchHrmsMemberProjectsTasksAnalytics(props: {
  member: MemberPayload;
  body: IHrmsTask.IRequest;
}): Promise<IHrmsTask.ISummary> {
  // Build where filter
  const whereInput: Prisma.hrms_tasksWhereInput = {
    deleted_at: null,
    hrms_project_id: props.body.projectIds?.length
      ? { in: props.body.projectIds }
      : undefined,
    hrms_employee_id: props.body.employeeIds?.length
      ? { in: props.body.employeeIds }
      : undefined,
    status: props.body.status?.length ? { in: props.body.status } : undefined,
    priority: props.body.priority?.length
      ? { in: props.body.priority }
      : undefined,
    ...(props.body.withAssignment === true && {
      hrms_employee_id: { not: null },
    }),
    ...(props.body.withAssignment === false && {
      hrms_employee_id: null,
    }),
    ...(props.body.parentTaskFilter === "parent" && {
      hrms_task_id: null,
    }),
    ...(props.body.parentTaskFilter === "subtask" && {
      hrms_task_id: { not: null },
    }),
    created_at:
      props.body.createdDateFrom || props.body.createdDateTo
        ? {
            ...(props.body.createdDateFrom && {
              gte: new Date(props.body.createdDateFrom),
            }),
            ...(props.body.createdDateTo && {
              lte: new Date(props.body.createdDateTo),
            }),
          }
        : undefined,
    due_date:
      props.body.dueDateFrom || props.body.dueDateTo
        ? {
            ...(props.body.dueDateFrom && {
              gte: new Date(props.body.dueDateFrom),
            }),
            ...(props.body.dueDateTo && {
              lte: new Date(props.body.dueDateTo),
            }),
          }
        : undefined,
  } satisfies Prisma.hrms_tasksWhereInput;
  // Group tasks by project and count
  const groupedTasks = await MyGlobal.prisma.hrms_tasks.groupBy({
    by: ["hrms_project_id"],
    where: whereInput,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  // Fetch project details for grouped results
  const projectIds = groupedTasks.map((item) => item.hrms_project_id);
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      id: { in: projectIds },
    },
    select: { id: true, name: true },
  });
  // Build result
  const result: IHrmsTask.ISummary = {
    project_id:
      projectIds.length > 0
        ? projectIds[0]
        : (v4() as string & tags.Format<"uuid">),
    project_name: projects.length > 0 ? projects[0].name : "",
    task_count: groupedTasks.length > 0 ? groupedTasks[0]._count.id : 0,
  } satisfies IHrmsTask.ISummary;
  return result;
}
