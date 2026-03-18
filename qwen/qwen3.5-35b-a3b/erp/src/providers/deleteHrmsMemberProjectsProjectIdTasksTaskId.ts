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

export async function deleteHrmsMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify project exists and belongs to member's organization
  const project = await MyGlobal.prisma.hrms_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true, hrms_organization_id: true },
  });
  if (!project) {
    throw new HttpException("Project not found", 404);
  }
  // Verify user belongs to the project's organization
  const memberOrg = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: project.hrms_organization_id,
    },
    select: { hrms_organization_role_id: true },
  });
  if (!memberOrg) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Check if user has project:manage permission (Owner or Manager roles)
  const role = await MyGlobal.prisma.hrms_organization_roles.findUnique({
    where: { id: memberOrg.hrms_organization_role_id },
    select: { id: true, organization_id: true, name: true, is_builtin: true },
  });
  if (!role || !role.is_builtin) {
    throw new HttpException("Forbidden: Insufficient permissions", 403);
  }
  const hasManagePermission = role.name === "Owner" || role.name === "Manager";
  if (!hasManagePermission) {
    throw new HttpException(
      "Forbidden: You don't have permission to manage this project",
      403,
    );
  }
  // Verify task exists and belongs to project
  const task = await MyGlobal.prisma.hrms_tasks.findUnique({
    where: { id: props.taskId },
    select: { id: true, hrms_project_id: true, deleted_at: true, title: true },
  });
  if (!task || task.hrms_project_id !== props.projectId) {
    throw new HttpException("Task not found", 404);
  }
  // Verify task is not already deleted
  if (task.deleted_at !== null) {
    throw new HttpException("Task already deleted", 400);
  }
  // Soft delete the task by setting deleted_at timestamp
  await MyGlobal.prisma.hrms_tasks.update({
    where: { id: props.taskId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Create activity log entry for audit trail
  await MyGlobal.prisma.hrms_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: project.hrms_organization_id,
      performed_by_id: props.member.id,
      action_type: "task.deleted",
      target_entity: "task",
      target_id: props.taskId,
      details: `Task "${task.title}" was deleted`,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
}
