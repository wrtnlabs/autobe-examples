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

export async function deleteErpHrmMemberRolesRoleIdPermissionsPermissionId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  permissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get organization member record and role with permissions to check authorization
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role: {
          select: {
            rolePermissions: {
              where: { deleted_at: null },
              select: { permission: true },
            },
          },
        },
      },
    });
  if (orgMember === null) {
    throw new HttpException("Organization member not found or inactive", 403);
  }
  // Check if member has required permission
  const hasManagePermission = orgMember.role.rolePermissions.some(
    (rp) =>
      rp.permission === "role.manage" ||
      rp.permission === "organization.manage",
  );
  if (!hasManagePermission) {
    throw new HttpException("Forbidden - insufficient permissions", 403);
  }
  // Find the target role and verify it belongs to the same organization
  const targetRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      id: props.roleId,
      organization_id: orgMember.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      is_builtin: true,
      name: true,
    },
  });
  if (targetRole === null) {
    throw new HttpException("Role not found", 404);
  }
  // Built-in roles cannot be modified
  if (targetRole.is_builtin) {
    throw new HttpException(
      "Built-in role permissions cannot be modified",
      403,
    );
  }
  // Find the permission record
  const permissionRecord =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        id: props.permissionId,
        role_id: props.roleId,
        deleted_at: null,
      },
      select: {
        id: true,
        permission: true,
      },
    });
  // If permission record not found, treat as success (idempotent)
  if (permissionRecord === null) {
    return;
  }
  // Execute hard delete within transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Hard delete the permission record
    await tx.erp_hrm_role_permissions.delete({
      where: { id: props.permissionId },
    });
    // Log the activity
    await tx.erp_hrm_activity_logs.create({
      data: {
        id: v4(),
        organization_id: orgMember.organization_id,
        actor_member_id: props.member.id,
        action: "delete",
        entity_type: "role_permission",
        entity_id: props.permissionId,
        created_at: new Date(),
      },
    });
  });
}
