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
  // Verify member exists and is active
  const memberRecord = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  if (!memberRecord) {
    throw new HttpException("Member not found or deactivated", 404);
  }
  // Verify task exists and belongs to the specified project
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      hrm_platform_project_id: true,
      parent_id: true,
    },
  });
  // Verify task belongs to the specified project
  if (task.hrm_platform_project_id !== props.projectId) {
    throw new HttpException(
      "Task does not belong to the specified project",
      404,
    );
  }
  // Check if user is project lead in this project
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: props.member.id,
        deleted_at: null,
      },
      select: {
        role: true,
      },
    });
  // Check if user has project:manage permission through their employee role
  let hasProjectManagePermission = false;
  if (!projectMembership || projectMembership.role !== "project-lead") {
    const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
      select: {
        role_id: true,
      },
    });
    if (employee?.role_id) {
      const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
        where: { id: employee.role_id },
        select: {
          permissions: {
            select: {
              permission: true,
            },
          },
        },
      });
      hasProjectManagePermission =
        role?.permissions.some((p) => p.permission === "project:manage") ??
        false;
    }
  }
  // Authorization check: must be project lead OR have project:manage permission
  const isProjectLead = projectMembership?.role === "project-lead";
  if (!isProjectLead && !hasProjectManagePermission) {
    throw new HttpException(
      "Forbidden: User lacks permission to delete this task",
      403,
    );
  }
  // Soft delete the task
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: { id: props.taskId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Cascade soft delete to all child tasks (subtasks)
  const childTasks = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: {
      parent_id: props.taskId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (childTasks.length > 0) {
    await MyGlobal.prisma.hrm_platform_tasks.updateMany({
      where: {
        id: {
          in: childTasks.map((child) => child.id),
        },
      },
      data: {
        deleted_at: toISOStringSafe(new Date()),
      },
    });
  }
}
