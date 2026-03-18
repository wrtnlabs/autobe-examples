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
  projectId: string & tags.Format<"uuid">;
  projectMemberId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Look up the project
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // 2. Find the calling member's organization member record
  const callerOrgMember =
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
  if (callerOrgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check project:manage permission
  const permissionRecord =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: callerOrgMember.role_id,
        permission_code: "project:manage",
      },
      select: {
        id: true,
      },
    });
  if (permissionRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Look up the target project member
  const targetProjectMember =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        id: props.projectMemberId,
        project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_member_id: true,
      },
    });
  if (targetProjectMember === null) {
    throw new HttpException("Project member not found", 404);
  }
  // 5. Transaction: soft-delete the project member + clear task assignments
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_project_members.update({
      where: { id: props.projectMemberId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
    await tx.erp_hrm_tasks.updateMany({
      where: {
        erp_hrm_project_id: props.projectId,
        erp_hrm_organization_member_id:
          targetProjectMember.organization_member_id,
        deleted_at: null,
      },
      data: {
        erp_hrm_organization_member_id: null,
        updated_at: new Date(),
      },
    });
  });
}
