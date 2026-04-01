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
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const whereInput: Prisma.hrms_tasksWhereInput = {
    deleted_at: null,
  };
  if (props.body.projectIds !== undefined && props.body.projectIds.length > 0) {
    whereInput.hrms_project_id = {
      in: props.body.projectIds,
    };
  }
  if (props.body.status !== undefined && props.body.status.length > 0) {
    whereInput.status = {
      in: props.body.status,
    };
  }
  if (props.body.priority !== undefined && props.body.priority.length > 0) {
    whereInput.priority = {
      in: props.body.priority,
    };
  }
  if (props.body.dueDateFrom !== undefined) {
    whereInput.due_date = {
      gte: new Date(props.body.dueDateFrom + "T00:00:00Z"),
    } satisfies Prisma.DateTimeNullableFilter<"hrms_tasks">;
  }
  if (props.body.dueDateTo !== undefined) {
    if (whereInput.due_date !== undefined) {
      const existing = whereInput.due_date;
      whereInput.due_date = {
        gte: (
          existing as Prisma.DateTimeNullableFilter<"hrms_tasks"> & {
            gte: Date;
          }
        ).gte,
        lte: new Date(props.body.dueDateTo + "T23:59:59Z"),
      } satisfies Prisma.DateTimeNullableFilter<"hrms_tasks">;
    } else {
      whereInput.due_date = {
        lte: new Date(props.body.dueDateTo + "T23:59:59Z"),
      } satisfies Prisma.DateTimeNullableFilter<"hrms_tasks">;
    }
  }
  if (props.body.createdDateFrom !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.createdDateFrom + "T00:00:00Z"),
    } satisfies Prisma.DateTimeFilter<"hrms_tasks">;
  }
  if (props.body.createdDateTo !== undefined) {
    if (whereInput.created_at !== undefined) {
      const existing = whereInput.created_at;
      whereInput.created_at = {
        gte: (
          existing as Prisma.DateTimeFilter<"hrms_tasks"> & {
            gte: Date;
          }
        ).gte,
        lte: new Date(props.body.createdDateTo + "T23:59:59Z"),
      } satisfies Prisma.DateTimeFilter<"hrms_tasks">;
    } else {
      whereInput.created_at = {
        lte: new Date(props.body.createdDateTo + "T23:59:59Z"),
      } satisfies Prisma.DateTimeFilter<"hrms_tasks">;
    }
  }
  if (
    props.body.employeeIds !== undefined &&
    props.body.employeeIds.length > 0
  ) {
    whereInput.hrms_employee_id = {
      in: props.body.employeeIds,
    } satisfies Prisma.UuidNullableFilter<"hrms_tasks">;
  }
  if (props.body.withAssignment !== undefined) {
    if (props.body.withAssignment) {
      if (
        whereInput.hrms_employee_id !== undefined &&
        whereInput.hrms_employee_id !== null
      ) {
        const existing = whereInput.hrms_employee_id;
        whereInput.hrms_employee_id = {
          in: (
            existing as Prisma.UuidNullableFilter<"hrms_tasks"> & {
              in: string[];
            }
          ).in,
          not: null,
        } satisfies Prisma.UuidNullableFilter<"hrms_tasks">;
      }
    } else {
      whereInput.hrms_employee_id = null;
    }
  }
  if (props.body.parentTaskFilter === "parent") {
    whereInput.hrms_task_id = null;
  } else if (props.body.parentTaskFilter === "subtask") {
    whereInput.hrms_task_id = {
      not: null,
    };
  }
  const tasks: Array<{
    id: string;
    hrms_project_id: string;
  }> = await MyGlobal.prisma.hrms_tasks.findMany({
    where: whereInput,
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      hrms_project_id: true,
    },
  });
  const projectMap: Record<
    string,
    {
      name: string;
      count: number;
    }
  > = {};
  for (const task of tasks) {
    if (!projectMap[task.hrms_project_id]) {
      const project: {
        name: string;
      } | null = await MyGlobal.prisma.hrms_projects.findUnique({
        where: { id: task.hrms_project_id },
        select: { name: true },
      });
      projectMap[task.hrms_project_id] = {
        name: project?.name ?? "Unknown",
        count: 0,
      };
    }
    projectMap[task.hrms_project_id].count += 1;
  }
  const projectCounts: Record<string, number> = {};
  for (const projectId of Object.keys(projectMap)) {
    const count: number = await MyGlobal.prisma.hrms_tasks.count({
      where: {
        ...whereInput,
        hrms_project_id: projectId,
      },
    });
    projectCounts[projectId] = count;
  }
  const results: Array<{
    project_id: string;
    project_name: string;
    task_count: number;
  }> = Object.entries(projectCounts).map(([projectId, count]) => ({
    project_id: projectId,
    project_name: projectMap[projectId].name,
    task_count: count,
  }));
  if (props.body.grouping !== undefined && results.length === 1) {
    const result: IHrmsTask.ISummary = {
      project_id: results[0].project_id,
      project_name: results[0].project_name,
      task_count: results[0].task_count,
    } satisfies IHrmsTask.ISummary;
    return result;
  }
  if (results.length > 0) {
    const result: IHrmsTask.ISummary = {
      project_id: results[0].project_id,
      project_name: results[0].project_name,
      task_count: results[0].task_count,
    } satisfies IHrmsTask.ISummary;
    return result;
  }
  return {
    project_id: "00000000-0000-0000-0000-000000000000",
    project_name: "Unknown",
    task_count: 0,
  } satisfies IHrmsTask.ISummary;
}
