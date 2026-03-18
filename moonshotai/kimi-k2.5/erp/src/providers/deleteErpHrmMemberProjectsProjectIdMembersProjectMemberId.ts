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

export async function deleteErpHrmMemberProjectsProjectIdMembersProjectMemberId(props: {
  member: MemberPayload;
  projectId: string;
  projectMemberId: string;
}): Promise<void> {
  // Get the organization member record for the authenticated member
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
    throw new HttpException("Organization member not found", 404);
  }
  // Check if member has project management permission
  const hasProjectManagePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: organizationMember.role_id,
        permission: "permission:project:manage",
        deleted_at: null,
      },
    });
  if (hasProjectManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify project exists and belongs to member's organization
  await MyGlobal.prisma.erp_hrm_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      organization_id: organizationMember.organization_id,
      deleted_at: null,
    },
  });
  // Verify project member exists and belongs to the project
  const projectMember = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        id: props.projectMemberId,
        project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_member_id: true,
        role: true,
      },
    },
  );
  if (projectMember === null) {
    throw new HttpException("Project member not found", 404);
  }
  // Soft delete the project member
  const now = new Date().toISOString();
  await MyGlobal.prisma.erp_hrm_project_members.update({
    where: {
      id: props.projectMemberId,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Log activity
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      organization_id: organizationMember.organization_id,
      actor_member_id: props.member.id,
      action: "delete",
      entity_type: "project_member",
      entity_id: props.projectMemberId,
      created_at: now,
    },
  });
}
