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

export async function deleteHrmsMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify task exists and get project context
  const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      hrms_project_id: true,
      title: true,
      deleted_at: true,
    },
  });
  // Ensure task is not already soft deleted
  if (task.deleted_at !== null) {
    throw new HttpException("Task already deleted", 400);
  }
  // Step 2: Get project to validate organization
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: task.hrms_project_id },
    select: {
      id: true,
      hrms_organization_id: true,
    },
  });
  // Step 3: Check if member has project membership (via employee)
  // First get the member's employee record for this organization
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organizationMember: {
        hrms_member_id: props.member.id,
        hrms_organization_id: project.hrms_organization_id,
      },
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Unauthorized", 403);
  }
  // Step 4: Verify user has project-lead role for this project
  const membership = await MyGlobal.prisma.hrms_project_members.findFirst({
    where: {
      employee_id: employee.id,
      project_id: task.hrms_project_id,
      status: "active",
    },
  });
  if (membership === null || membership.role !== "project-lead") {
    throw new HttpException("Unauthorized", 403);
  }
  // Step 5: Soft delete task
  await MyGlobal.prisma.hrms_tasks.update({
    where: { id: props.taskId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Step 6: Soft delete task status history records
  await MyGlobal.prisma.hrms_task_status_histories.deleteMany({
    where: {
      hrms_task_id: props.taskId,
      deleted_at: null,
    },
  });
  // Step 7: Log deletion in activity log
  const activityLogId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.hrms_activity_logs.create({
    data: {
      id: activityLogId,
      organization_id: project.hrms_organization_id,
      performed_by_id: props.member.id,
      action_type: "task.deleted",
      target_entity: "task",
      target_id: props.taskId,
      details: JSON.stringify({ task_title: task.title }),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
}
