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
import { ErpHrmRolePermissionCollector } from "../collectors/ErpHrmRolePermissionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRolePermissionTransformer } from "../transformers/ErpHrmRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRolePermission.ICreate;
}): Promise<IErpHrmRolePermission> {
  // Find role and verify it exists
  const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: { id: true, is_builtin: true },
  });
  // Check if role is built-in (protected from modification)
  if (role.is_builtin) {
    throw new HttpException(
      "Built-in roles have fixed permissions that cannot be modified",
      403,
    );
  }
  // Check for existing active permission
  const existingPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: props.roleId,
        permission: props.body.permission,
        deleted_at: null,
      },
    });
  if (existingPermission !== null) {
    throw new HttpException("Permission already assigned to this role", 409);
  }
  // Create permission using collector
  const created = await MyGlobal.prisma.erp_hrm_role_permissions.create({
    data: await ErpHrmRolePermissionCollector.collect({
      body: props.body,
      erpHrmRoles: { id: role.id },
    }),
    ...ErpHrmRolePermissionTransformer.select(),
  });
  return await ErpHrmRolePermissionTransformer.transform(created);
}
