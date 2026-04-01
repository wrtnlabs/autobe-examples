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
  // 1. Verify project exists and user has project:manage permission
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, hrms_organization_id: true, status: true },
  });
  // Get organization member to check role permissions
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: project.hrms_organization_id,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if user has project:manage permission through role
  const projectMember = await MyGlobal.prisma.hrms_project_members.findFirst({
    where: {
      project_id: props.projectId,
      employee: { organizationMember: { id: organizationMember.id } },
    },
  });
  if (projectMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate task exists, belongs to project, and is not already deleted
  const task = await MyGlobal.prisma.hrms_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      hrms_project_id: props.projectId,
      deleted_at: null,
    },
    select: { id: true, title: true, hrms_project_id: true },
  });
  // 3. Soft delete the task
  await MyGlobal.prisma.hrms_tasks.update({
    where: { id: props.taskId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // 4. Create activity log entry
  await MyGlobal.prisma.hrms_activity_logs.create({
    data: {
      id: v4(),
      organization_id: project.hrms_organization_id,
      performed_by_id: props.member.id,
      target_id: props.taskId,
      details: JSON.stringify({
        task_id: props.taskId,
        task_title: task.title,
        project_id: props.projectId,
        action: "task_deleted",
      }),
      action_type: "task_deleted",
      target_entity: "task",
      updated_at: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
