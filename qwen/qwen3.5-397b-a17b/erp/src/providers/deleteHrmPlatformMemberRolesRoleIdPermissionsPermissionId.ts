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

export async function deleteHrmPlatformMemberRolesRoleIdPermissionsPermissionId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  permissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate role exists and get its details
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: props.roleId, deleted_at: null },
    select: {
      id: true,
      organization_id: true,
      built_in: true,
    },
  });
  if (!role) {
    throw new HttpException("Role not found", 404);
  }
  // Built-in roles cannot have their permissions modified
  if (role.built_in) {
    throw new HttpException("Cannot modify permissions of built-in roles", 403);
  }
  // Verify member belongs to the organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: role.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Member does not belong to this organization", 403);
  }
  // Verify member has role management capability (org:manage permission)
  const memberRolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        role_id: employee.role_id,
        deleted_at: null,
      },
      select: {
        permission: true,
      },
    });
  const hasOrgManage = memberRolePermissions.some(
    (p) => p.permission === "org:manage",
  );
  if (!hasOrgManage) {
    throw new HttpException(
      "Insufficient permissions to manage role permissions",
      403,
    );
  }
  // Validate permission exists and belongs to the role
  const permission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findUnique({
      where: { id: props.permissionId, deleted_at: null },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (!permission) {
    throw new HttpException("Permission not found", 404);
  }
  if (permission.role_id !== props.roleId) {
    throw new HttpException(
      "Permission does not belong to the specified role",
      400,
    );
  }
  // Perform soft delete
  await MyGlobal.prisma.hrm_platform_role_permissions.update({
    where: { id: props.permissionId },
    data: {
      deleted_at: new Date(),
    },
  });
}
