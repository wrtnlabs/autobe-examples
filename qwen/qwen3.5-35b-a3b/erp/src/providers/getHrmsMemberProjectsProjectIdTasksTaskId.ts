import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
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

export async function getHrmsMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IHrmsTask> {
  // Fetch task with proper filtering
  const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      hrms_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrms_project_id: true,
      hrms_employee_id: true,
      hrms_task_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      billable: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    analytics: [
      {
        project_id: task.hrms_project_id,
        project_name: "",
        task_count: 1,
      },
    ],
    total_projects: 1,
    total_budget_hours: null,
    total_logged_hours: null,
  } satisfies IHrmsTask;
}
