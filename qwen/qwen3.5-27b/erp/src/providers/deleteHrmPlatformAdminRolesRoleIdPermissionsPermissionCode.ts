import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformAdminRolesRoleIdPermissionsPermissionCode(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  permissionCode: string;
}): Promise<void> {
  // Find the role and verify it exists and is not soft-deleted
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      is_builtin: true,
    },
  });
  // Check that the role is not a built-in role
  if (role.is_builtin === true) {
    throw new HttpException("Cannot modify built-in role permissions", 405);
  }
  // Find the permission assignment record
  const permissionAssignment =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: props.roleId,
        permission_code: props.permissionCode,
        deleted_at: null,
      },
    });
  // If permission assignment doesn't exist, return 404
  if (permissionAssignment === null) {
    throw new HttpException("Permission assignment not found", 404);
  }
  // Soft delete the permission assignment
  await MyGlobal.prisma.hrm_platform_role_permissions.update({
    where: {
      id: permissionAssignment.id,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Record the permission removal in activity log
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrm_platform_organization_id: role.hrm_platform_organization_id,
      hrm_platform_member_id: null,
      action_type: "role_permission_removed",
      target_entity_type: "role_permission",
      target_entity_id: permissionAssignment.id,
      action_description: `Removed permission '${props.permissionCode}' from role`,
      created_at: new Date(),
    },
  });
}
