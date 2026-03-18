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

export async function deleteErpHrmMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string;
}): Promise<void> {
  // Find the role and its organization
  const role = await MyGlobal.prisma.erp_hrm_roles.findUnique({
    where: { id: props.roleId },
    select: {
      id: true,
      organization_id: true,
      is_builtin: true,
      deleted_at: true,
    },
  });
  // Check role exists
  if (role === null) {
    throw new HttpException("Role not found", 404);
  }
  // Check role is not already deleted
  if (role.deleted_at !== null) {
    throw new HttpException("Role already deleted", 404);
  }
  // Find the requesting member's organization membership to verify permissions
  const requestingMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        organization_id: role.organization_id,
        is_active: true,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    });
  if (requestingMember === null) {
    throw new HttpException(
      "You do not have permission to manage this organization",
      403,
    );
  }
  // Check if member has organization management permission
  const hasManagePermission = requestingMember.role.rolePermissions.some(
    (rp: { permission: string }) => rp.permission === "org:manage",
  );
  if (!hasManagePermission) {
    throw new HttpException(
      "You do not have organization management permission",
      403,
    );
  }
  // Check if role is built-in (protected)
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be deleted", 400);
  }
  // Check if any members are assigned to this role
  const assignedMemberCount =
    await MyGlobal.prisma.erp_hrm_organization_members.count({
      where: {
        role_id: props.roleId,
        deleted_at: null,
      },
    });
  if (assignedMemberCount > 0) {
    throw new HttpException(
      "Cannot delete role: members are still assigned to this role. Reassign all members first.",
      400,
    );
  }
  // Soft delete the role
  await MyGlobal.prisma.erp_hrm_roles.update({
    where: { id: props.roleId },
    data: {
      deleted_at: new Date(),
    },
  });
}
