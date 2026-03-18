import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRolePermissionTransformer } from "../transformers/ErpHrmRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRolePermission.IUpdate;
}): Promise<IErpHrmRolePermission> {
  // Verify role exists
  const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: { id: true, is_builtin: true },
  });
  // Built-in roles cannot be modified
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 403);
  }
  const permissionValue = props.body.permission;
  // Check if a permission record already exists for this role
  // For simplicity, we get the first active permission or create/update as needed
  const existingPermissions =
    await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
      where: {
        role_id: props.roleId,
        deleted_at: null,
      },
      select: { id: true },
      take: 1,
    });
  let permissionId: string & tags.Format<"uuid">;
  if (existingPermissions.length > 0) {
    // Update the existing permission record
    permissionId = existingPermissions[0].id as string & tags.Format<"uuid">;
    await MyGlobal.prisma.erp_hrm_role_permissions.update({
      where: { id: permissionId },
      data: {
        ...(permissionValue !== undefined && { permission: permissionValue }),
        updated_at: new Date(),
      },
    });
  } else {
    // Check for soft-deleted permission to restore
    const softDeletedPermission =
      await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
        where: {
          role_id: props.roleId,
          deleted_at: { not: null },
        },
        select: { id: true },
      });
    if (softDeletedPermission) {
      // Restore soft-deleted permission
      permissionId = softDeletedPermission.id as string & tags.Format<"uuid">;
      await MyGlobal.prisma.erp_hrm_role_permissions.update({
        where: { id: permissionId },
        data: {
          ...(permissionValue !== undefined && { permission: permissionValue }),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    } else {
      // Create new permission record
      permissionId = v4();
      await MyGlobal.prisma.erp_hrm_role_permissions.create({
        data: {
          id: permissionId,
          role: { connect: { id: props.roleId } },
          permission: permissionValue ?? "",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
  }
  // Fetch and return transformed result
  const result =
    await MyGlobal.prisma.erp_hrm_role_permissions.findUniqueOrThrow({
      where: { id: permissionId },
      ...ErpHrmRolePermissionTransformer.select(),
    });
  return await ErpHrmRolePermissionTransformer.transform(result);
}
