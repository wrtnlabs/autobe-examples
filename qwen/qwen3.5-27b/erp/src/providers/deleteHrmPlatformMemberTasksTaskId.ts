import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteHrmPlatformMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get the member's current organization from session
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { hrm_platform_organization_id: true },
    });
  // Find the task and verify it belongs to the member's organization
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      title: true,
      deleted_at: true,
      project: {
        select: { organization_id: true },
      },
    },
  });
  // Verify task belongs to member's organization
  if (task.project.organization_id !== session.hrm_platform_organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if task is already soft deleted
  if (task.deleted_at !== null) {
    throw new HttpException("Task is already deleted", 400);
  }
  // Soft delete the task
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: { id: props.taskId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Create activity log entry
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      hrm_platform_organization_id: session.hrm_platform_organization_id,
      hrm_platform_member_id: props.member.id,
      action_type: "task_deleted",
      target_entity_type: "task",
      target_entity_id: props.taskId,
      action_description: `Task "${task.title}" was soft deleted`,
      created_at: new Date(),
    },
  });
}
