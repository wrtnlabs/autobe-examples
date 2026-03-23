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

export async function deleteHrmPlatformAdminTasksTaskId(props: {
  admin: AdminPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the task and verify it exists
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      deleted_at: true,
      project: {
        select: {
          id: true,
          organization_id: true,
        },
      },
    },
  });
  // Check if task is already soft deleted
  if (task.deleted_at !== null) {
    throw new HttpException("Task is already deleted", 400);
  }
  // Soft delete the task by setting deleted_at to current timestamp
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: { id: props.taskId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Create activity log entry recording the deletion action
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrm_platform_organization_id: task.project.organization_id,
      hrm_platform_member_id: null,
      action_type: "task_deleted",
      target_entity_type: "task",
      target_entity_id: task.id,
      action_description: `Task ${task.id} was soft deleted by admin`,
      ip_address: null,
      user_agent: null,
      created_at: new Date(),
    },
  });
}
