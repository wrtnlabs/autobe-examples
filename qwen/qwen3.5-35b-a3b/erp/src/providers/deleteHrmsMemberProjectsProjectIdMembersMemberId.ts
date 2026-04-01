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

export async function deleteHrmsMemberProjectsProjectIdMembersMemberId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const memberOrganization =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: { hrms_member_id: props.member.id, deleted_at: null },
      include: {
        organization: { select: { id: true } },
        organizationRole: {
          select: { id: true, name: true, is_builtin: true },
        },
      },
    });
  if (memberOrganization === null) {
    throw new HttpException("Member not enrolled in any organization", 403);
  }
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, hrms_organization_id: true },
  });
  if (project.hrms_organization_id !== memberOrganization.organization.id) {
    throw new HttpException(
      "Project does not belong to your organization",
      403,
    );
  }
  const membership =
    await MyGlobal.prisma.hrms_project_members.findUniqueOrThrow({
      where: { id: props.memberId },
      include: { employee: { select: { organization_member_id: true } } },
    });
  if (membership.project_id !== props.projectId) {
    throw new HttpException(
      "Membership does not belong to the specified project",
      403,
    );
  }
  const deletingMemberOrganization =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: { hrms_member_id: props.member.id, deleted_at: null },
      include: {
        organizationRole: {
          select: { id: true, name: true, is_builtin: true },
        },
      },
    });
  if (deletingMemberOrganization === null) {
    throw new HttpException("Deleter not enrolled in any organization", 403);
  }
  if (
    deletingMemberOrganization.organizationRole.is_builtin &&
    deletingMemberOrganization.organizationRole.name === "Owner"
  ) {
    throw new HttpException(
      "Cannot remove organization owner from projects",
      403,
    );
  }
  const hasProjectManagePermission =
    await MyGlobal.prisma.hrms_organization_role_permissions.findFirst({
      where: {
        hrms_organization_role_id:
          deletingMemberOrganization.organizationRole.id,
        permission: "project:manage",
      },
    });
  if (hasProjectManagePermission === null) {
    throw new HttpException("Insufficient permissions to remove members", 403);
  }
  await MyGlobal.prisma.hrms_project_members.update({
    where: { id: props.memberId },
    data: { deleted_at: new Date() },
  });
}
