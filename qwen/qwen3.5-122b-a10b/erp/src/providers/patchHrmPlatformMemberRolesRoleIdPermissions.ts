import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRole.IPermissionUpdate;
}): Promise<IHrmPlatformRole> {
  // 1. Validate role exists and get basic info
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      is_builtin: true,
      hrm_platform_organization_id: true,
    },
  });
  // 2. Reject if built-in role
  if (role.is_builtin) {
    throw new HttpException(
      "Built-in roles cannot have their permissions modified",
      403,
    );
  }
  // 3. Validate all permission IDs exist and are active (not deleted)
  if (props.body.permission_ids.length > 0) {
    const uniquePermissionIds = Array.from(new Set(props.body.permission_ids));
    const permissions = await MyGlobal.prisma.hrm_platform_permissions.findMany(
      {
        where: {
          id: { in: uniquePermissionIds },
          deleted_at: null,
        },
      },
    );
    const validPermissionIds = new Set(permissions.map((p) => p.id));
    const invalidIds = uniquePermissionIds.filter(
      (id) => !validPermissionIds.has(id),
    );
    if (invalidIds.length > 0) {
      throw new HttpException(
        `Invalid permission IDs: ${invalidIds.join(", ")}`,
        400,
      );
    }
  }
  // 4. Delete existing role_permissions and insert new ones in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete existing permissions
    await tx.hrm_platform_role_permissions.deleteMany({
      where: { hrm_platform_role_id: props.roleId },
    });
    // Insert new permissions
    if (props.body.permission_ids.length > 0) {
      const uniquePermissionIds = Array.from(
        new Set(props.body.permission_ids),
      );
      await tx.hrm_platform_role_permissions.createMany({
        data: uniquePermissionIds.map((permissionId) => ({
          id: v4(),
          hrm_platform_role_id: props.roleId,
          hrm_platform_permission_id: permissionId,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
      });
    }
    // Update role's updated_at
    await tx.hrm_platform_roles.update({
      where: { id: props.roleId },
      data: { updated_at: new Date() },
    });
  });
  // 5. Fetch updated role with permissions
  const updatedRole =
    await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
      where: { id: props.roleId },
      ...HrmPlatformRoleTransformer.select(),
    });
  // 6. Transform and return
  return await HrmPlatformRoleTransformer.transform(updatedRole);
}
