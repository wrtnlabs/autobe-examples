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
  // 1. Verify task exists within the specified project
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      hrm_platform_projects_id: true,
    },
  });
  // Verify task belongs to the specified project
  if (task.hrm_platform_projects_id !== props.projectId) {
    throw new HttpException("Task not found in this project", 404);
  }
  // 2. Get the user's employee record
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 403);
  }
  // 3. Check project membership and role
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        role: true,
      },
    });
  let hasPermission = false;
  // Check if user is project-lead
  if (projectMember?.role === "project-lead") {
    hasPermission = true;
  }
  // If not project-lead, check for project:manage permission
  if (!hasPermission && employee.hrm_platform_role_id) {
    // First find the permission by code
    const permission = await MyGlobal.prisma.hrm_platform_permissions.findFirst(
      {
        where: {
          code: "project:manage",
          deleted_at: null,
        },
        select: { id: true },
      },
    );
    // Then check if the role has this permission
    if (permission) {
      const hasProjectManagePermission =
        await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
          where: {
            hrm_platform_role_id: employee.hrm_platform_role_id,
            hrm_platform_permission_id: permission.id,
            deleted_at: null,
          },
        });
      if (hasProjectManagePermission) {
        hasPermission = true;
      }
    }
  }
  if (!hasPermission) {
    throw new HttpException("Forbidden: insufficient permissions", 403);
  }
  // 4. Delete the task (permanent deletion - cascade handles child records)
  await MyGlobal.prisma.hrm_platform_tasks.delete({
    where: { id: props.taskId },
  });
  // 5. Log activity event
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: employee.hrm_platform_organization_id,
      user_id: props.member.id,
      action_type: "task:deleted",
      target_entity: "task",
      target_id: props.taskId,
      details: JSON.stringify({ projectId: props.projectId }),
      created_at: new Date(),
    },
  });
}
