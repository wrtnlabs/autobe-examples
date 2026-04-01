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

export async function deleteHrmPlatformMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Resolve member to employee record to check project membership and role
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  // Check if user is project lead for this project
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
    });
  // Get employee's role to check for project:manage permission
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: employee.role_id },
    select: {
      id: true,
      rolePermissions: {
        select: { permission: true },
      },
    },
  });
  // Check permission: project:manage OR project-lead role
  const hasProjectManagePermission = role?.rolePermissions.some(
    (p: { permission: string }) => p.permission === "project:manage",
  );
  const isProjectLead = projectMembership?.role === "project-lead";
  if (!hasProjectManagePermission && !isProjectLead) {
    throw new HttpException(
      "Forbidden: Requires project:manage permission or project-lead role",
      403,
    );
  }
  // Verify task exists, belongs to project, and is not already deleted
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      hrm_platform_project_id: true,
      deleted_at: true,
    },
  });
  if (task.hrm_platform_project_id !== props.projectId) {
    throw new HttpException("Task does not belong to specified project", 400);
  }
  if (task.deleted_at !== null) {
    throw new HttpException("Task is already deleted", 400);
  }
  // Soft delete task (cascade handles subtasks via DB onDelete: Cascade)
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: { id: props.taskId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Get organization ID from project for activity log
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: { organization_id: true },
    },
  );
  // Record deletion in activity log
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: project.organization_id,
      member_id: props.member.id,
      action_type: "task.deleted",
      target_entity_type: "task",
      target_entity_id: props.taskId,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
}
