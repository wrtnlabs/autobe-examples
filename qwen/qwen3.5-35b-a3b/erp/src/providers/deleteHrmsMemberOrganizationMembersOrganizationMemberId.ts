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
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        id: props.organizationMemberId,
        deleted_at: null,
      },
      include: {
        member: true,
        organization: true,
        organizationRole: true,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Not found", 404);
  }
  const requestingMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: organizationMember.organization.id,
        deleted_at: null,
      },
      include: {
        organizationRole: true,
      },
    });
  if (requestingMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  const requestingPermissions =
    await MyGlobal.prisma.hrms_organization_role_permissions.findMany({
      where: {
        hrms_organization_role_id: requestingMember.hrms_organization_role_id,
      },
    });
  const hasOwnership =
    requestingMember.organizationRole.name === "Owner" &&
    requestingMember.organizationRole.is_builtin;
  const hasEmployeeManagement = requestingPermissions.some(
    (p) => p.permission === "employee:manage",
  );
  if (!hasOwnership && !hasEmployeeManagement) {
    throw new HttpException("Forbidden", 403);
  }
  if (organizationMember.organizationRole.name === "Owner") {
    const ownerMembers =
      await MyGlobal.prisma.hrms_organization_members.findMany({
        where: {
          hrms_organization_id: organizationMember.organization.id,
          hrms_organization_role_id: organizationMember.organizationRole.id,
          deleted_at: null,
        },
      });
    if (ownerMembers.length <= 1) {
      throw new HttpException("Cannot remove the sole owner", 409);
    }
  }
  await MyGlobal.prisma.hrms_organization_members.update({
    where: {
      id: props.organizationMemberId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
  const now = new Date();
  await MyGlobal.prisma.hrms_activity_logs.create({
    data: {
      id: v4(),
      organization_id: organizationMember.organization.id,
      performed_by_id: props.member.id,
      action_type: "employee.deactivated",
      target_entity: "organization_member",
      target_id: props.organizationMemberId,
      details: "Member removed from organization",
      created_at: now,
      updated_at: now,
    },
  });
}
