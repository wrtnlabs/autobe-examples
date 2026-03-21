import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmRoleTransformer } from "../transformers/ErpHrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminRolesRoleIdPermissions(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRole.IPermissionUpdate;
}): Promise<IErpHrmRole> {
  // Find the role and verify it exists
  const role = await MyGlobal.prisma.erp_hrm_roles.findUnique({
    where: { id: props.roleId },
    select: {
      id: true,
      is_builtin: true,
    },
  });
  // Role not found - return 404 (not 403 to prevent enumeration)
  if (role === null) {
    throw new HttpException("Role not found", 404);
  }
  // Built-in roles cannot have permissions modified
  if (role.is_builtin) {
    throw new HttpException("Cannot modify permissions of built-in roles", 403);
  }
  // Deduplicate permission codes
  const uniquePermissions = [...new Set(props.body.permission_codes)];
  // Use transaction to replace permissions
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete all existing permissions for this role
    await tx.erp_hrm_role_permissions.deleteMany({
      where: { erp_hrm_role_id: props.roleId },
    });
    // Insert new permissions (if any)
    if (uniquePermissions.length > 0) {
      const now = new Date();
      await tx.erp_hrm_role_permissions.createMany({
        data: uniquePermissions.map((permission) => ({
          id: v4() as string & tags.Format<"uuid">,
          erp_hrm_role_id: props.roleId,
          permission,
          created_at: now,
          updated_at: now,
        })),
      });
    }
  });
  // Fetch and return the updated role
  const updatedRole = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...ErpHrmRoleTransformer.select(),
  });
  return ErpHrmRoleTransformer.transform(updatedRole);
}
