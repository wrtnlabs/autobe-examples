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
  // Step 1: Find employee's role and check project:manage permission
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // Check if member has project:manage permission
  const hasProjectManagePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "project:manage",
      },
    });
  // Step 2: Check if member is project lead for the specified project
  const isProjectLead = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.projectId,
        assigned_role: "project_lead",
      },
    },
  );
  // Authorization: Must have project:manage OR be project lead
  if (!hasProjectManagePermission && !isProjectLead) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify task exists and belongs to the specified project
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      erp_hrm_project_id: true,
    },
  });
  // Verify the task belongs to the specified project
  if (task.erp_hrm_project_id !== props.projectId) {
    throw new HttpException("Task not found in this project", 404);
  }
  // Step 4: Delete the task (cascade handles subtasks and task_histories)
  await MyGlobal.prisma.erp_hrm_tasks.delete({
    where: { id: props.taskId },
  });
  // Return void (204 No Content)
}
