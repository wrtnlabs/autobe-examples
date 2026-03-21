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

export async function deleteErpHrmMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get employee record for the member
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Check authorization: project-lead role OR project:manage permission
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        role: true,
      },
    });
  const hasProjectManagePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "project:manage",
      },
    });
  const isProjectLead =
    projectMembership !== null && projectMembership.role === "project-lead";
  if (!isProjectLead && hasProjectManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve task and verify it belongs to the project
  const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
    where: {
      id: props.taskId,
      project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (task === null) {
    throw new HttpException("Task not found", 404);
  }
  // Check for associated timelogs
  const timelogCount = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: {
      task_id: props.taskId,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Cannot delete task with associated timelogs. Close the task instead.",
      409,
    );
  }
  // Check for subtasks
  const subtaskCount = await MyGlobal.prisma.erp_hrm_tasks.count({
    where: {
      parent_task_id: props.taskId,
      deleted_at: null,
    },
  });
  if (subtaskCount > 0) {
    throw new HttpException(
      "Cannot delete task with subtasks. Delete subtasks first.",
      409,
    );
  }
  // Soft delete the task
  const now = new Date();
  await MyGlobal.prisma.erp_hrm_tasks.update({
    where: { id: props.taskId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Create activity log
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      member_id: props.member.id,
      organization_id: employee.erp_hrm_organization_id,
      action_type: "task_deleted",
      entity_type: "task",
      entity_id: props.taskId,
      created_at: now,
    },
  });
}
