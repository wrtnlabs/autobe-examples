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
  projectId: string;
  taskId: string;
}): Promise<void> {
  // Get organization member record for the authenticated member
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Organization member not found", 403);
  }
  // Check for organization-level project:manage permission
  const hasProjectManagePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: organizationMember.role_id,
        permission: "project:manage",
        deleted_at: null,
      },
    });
  // Check for project-lead role in this specific project
  const isProjectLead = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        project_id: props.projectId,
        organization_member_id: organizationMember.id,
        role: "project-lead",
        deleted_at: null,
      },
    },
  );
  // Authorization: must have project:manage permission OR be project-lead
  if (hasProjectManagePermission === null && isProjectLead === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify task exists, belongs to project, and is not deleted
  await MyGlobal.prisma.erp_hrm_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  // Soft delete the task
  await MyGlobal.prisma.erp_hrm_tasks.update({
    where: {
      id: props.taskId,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
