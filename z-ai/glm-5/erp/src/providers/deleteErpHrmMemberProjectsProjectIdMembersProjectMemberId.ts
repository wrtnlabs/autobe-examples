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
  // 1. Get session to find organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization context selected", 400);
  }
  // 2. Get employee record for the member in this organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUnique({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
      },
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException(
      "Employee record not found in current organization",
      403,
    );
  }
  // 3. Check for 'project:manage' permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findUnique({
    where: {
      erp_hrm_role_id_permission: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "project:manage",
      },
    },
  });
  if (!permission) {
    throw new HttpException(
      "Forbidden - project:manage permission required",
      403,
    );
  }
  // 4. Validate project exists and belongs to organization
  const project = await MyGlobal.prisma.erp_hrm_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true, organization_id: true, deleted_at: true },
  });
  if (!project || project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.organization_id !== session.erp_hrm_organization_id) {
    throw new HttpException("Project not found", 404);
  }
  // 5. Validate project member exists and belongs to project
  const projectMember =
    await MyGlobal.prisma.erp_hrm_project_members.findUnique({
      where: { id: props.projectMemberId },
      select: {
        id: true,
        erp_hrm_project_id: true,
        deleted_at: true,
      },
    });
  if (!projectMember || projectMember.deleted_at !== null) {
    throw new HttpException("Project membership not found", 404);
  }
  if (projectMember.erp_hrm_project_id !== props.projectId) {
    throw new HttpException("Project membership not found", 404);
  }
  // 6. Soft delete the project member record
  await MyGlobal.prisma.erp_hrm_project_members.update({
    where: { id: props.projectMemberId },
    data: {
      deleted_at: new Date(),
    },
  });
}
