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

export async function deleteErpHrmMemberProjectsProjectIdMembersMemberId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the project to verify it exists and get organization context
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, erp_hrm_organization_id: true },
  });
  // Find the requesting member's employee record in the same organization
  const requesterEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: project.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (!requesterEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if the requester has project:manage permission via role_permissions table
  const rolePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: requesterEmployee.erp_hrm_role_id,
        permission: "project:manage",
      },
      select: { id: true },
    });
  if (!rolePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify project membership exists and belongs to the specified project
  await MyGlobal.prisma.erp_hrm_project_members.findUniqueOrThrow({
    where: {
      id: props.memberId,
      erp_hrm_project_id: props.projectId,
    },
    select: { id: true },
  });
  // Delete the project membership (historical timelogs are preserved automatically)
  await MyGlobal.prisma.erp_hrm_project_members.delete({
    where: { id: props.memberId },
  });
}
