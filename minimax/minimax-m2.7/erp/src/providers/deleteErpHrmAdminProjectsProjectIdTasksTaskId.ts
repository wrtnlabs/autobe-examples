import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmAdminProjectsProjectIdTasksTaskId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Get admin session and verify authorization
  const adminSession = await MyGlobal.prisma.erp_hrm_admin_sessions.findFirst({
    where: {
      id: props.admin.session_id,
      erp_hrm_admin_id: props.admin.id,
    },
    select: {
      erp_hrm_admin_id: true,
    },
  });
  if (!adminSession) {
    throw new HttpException("Unauthorized", 401);
  }
  // 2. Verify task exists and belongs to the specified project
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
    where: { id: props.taskId },
    select: { id: true, erp_hrm_project_id: true },
  });
  if (!task) {
    throw new HttpException("Task not found", 404);
  }
  if (task.erp_hrm_project_id !== props.projectId) {
    throw new HttpException("Task not found in this project", 404);
  }
  // 3. Delete the task (cascade handles subtasks and task_histories automatically)
  await MyGlobal.prisma.erp_hrm_tasks.delete({
    where: { id: props.taskId },
  });
}
