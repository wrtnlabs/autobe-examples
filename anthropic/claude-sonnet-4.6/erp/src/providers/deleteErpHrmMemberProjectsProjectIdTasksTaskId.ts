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
  // Step 1: Load the project (must exist and not be deleted)
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  // Step 2: Find the requesting member's organization member record
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Authorization check
  // Check project:manage permission
  const hasProjectManagePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: orgMember.role_id,
        permission_code: "project:manage",
      },
      select: { id: true },
    });
  // Check if project-lead for this project
  const isProjectLead = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        project_id: props.projectId,
        organization_member_id: orgMember.id,
        project_role: "project-lead",
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (hasProjectManagePermission === null && isProjectLead === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Load the task (must exist, belong to project, not be deleted)
  await MyGlobal.prisma.erp_hrm_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      erp_hrm_project_id: props.projectId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 5: Soft-delete in a transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    // Soft-delete subtasks first
    MyGlobal.prisma.erp_hrm_tasks.updateMany({
      where: {
        parent_id: props.taskId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    }),
    // Soft-delete the target task
    MyGlobal.prisma.erp_hrm_tasks.update({
      where: { id: props.taskId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    }),
  ]);
}
