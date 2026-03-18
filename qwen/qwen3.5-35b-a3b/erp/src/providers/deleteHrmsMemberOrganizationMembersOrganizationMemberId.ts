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

export async function deleteHrmsMemberOrganizationMembersOrganizationMemberId(props: {
  member: MemberPayload;
  organizationMemberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const targetMember =
    await MyGlobal.prisma.hrms_organization_members.findUniqueOrThrow({
      where: { id: props.organizationMemberId },
      select: {
        id: true,
        hrms_organization_id: true,
        hrms_organization_role_id: true,
        deleted_at: true,
        hrms_member_id: true,
        member: { select: { id: true } },
        organization: { select: { id: true, owner_id: true } },
        organizationRole: {
          select: { id: true, name: true, is_builtin: true },
        },
      },
    });
  if (targetMember.deleted_at !== null) {
    throw new HttpException("Organization member already deleted", 404);
  }
  const requestingMemberSession =
    await MyGlobal.prisma.hrms_member_sessions.findFirst({
      where: {
        hrms_member_id: props.member.id,
        id: props.member.session_id,
        expired_at: { gt: new Date() },
      },
    });
  if (requestingMemberSession === null) {
    throw new HttpException("Forbidden", 403);
  }
  const requestingActiveMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_organization_id: targetMember.organization.id,
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (requestingActiveMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  const requestingRole =
    await MyGlobal.prisma.hrms_organization_roles.findFirst({
      where: { id: requestingActiveMember.hrms_organization_role_id },
    });
  if (requestingRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (requestingRole.name !== "Owner" && requestingRole.name !== "Manager") {
    throw new HttpException("Forbidden", 403);
  }
  if (requestingRole.name === "Owner") {
    const ownerRoleId = targetMember.organizationRole.id;
    const ownerMembers =
      await MyGlobal.prisma.hrms_organization_members.findMany({
        where: {
          hrms_organization_id: targetMember.organization.id,
          hrms_organization_role_id: ownerRoleId,
          deleted_at: null,
        },
        select: { id: true, hrms_member_id: true },
      });
    if (ownerMembers.length <= 1) {
      throw new HttpException(
        "Cannot delete the last owner of an organization",
        409,
      );
    }
  }
  const deletedAt = new Date();
  await MyGlobal.prisma.hrms_organization_members.update({
    where: { id: props.organizationMemberId },
    data: { deleted_at: deletedAt },
  });
  await MyGlobal.prisma.hrms_activity_logs.create({
    data: {
      id: v4(),
      organization_id: targetMember.organization.id,
      performed_by_id: props.member.id,
      action_type: "delete_organization_member",
      target_entity: "hrms_organization_members",
      target_id: props.organizationMemberId,
      created_at: deletedAt,
      updated_at: deletedAt,
    },
  });
}
