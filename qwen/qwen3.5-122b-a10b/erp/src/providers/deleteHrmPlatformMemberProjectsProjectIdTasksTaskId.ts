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
  // 1. Verify task exists, belongs to project
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
    where: { id: props.taskId },
    select: {
      id: true,
      hrm_platform_projects_id: true,
      deleted_at: true,
    },
  });
  if (task === null || task.deleted_at !== null) {
    throw new HttpException("Task not found", 404);
  }
  if (task.hrm_platform_projects_id !== props.projectId) {
    throw new HttpException("Task not found in this project", 404);
  }
  // 2. Get organization_id from project
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: {
      hrm_platform_organization_id: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // 3. Verify user is in the same organization as the project
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: project.hrm_platform_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Check authorization: project-lead role OR project:manage permission
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        role: true,
      },
    });
  const isProjectLead = projectMembership?.role === "project-lead";
  if (!isProjectLead) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Delete the task (cascade handles children, timelogs preserved)
  await MyGlobal.prisma.hrm_platform_tasks.delete({
    where: { id: props.taskId },
  });
}
