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

export async function putErpHrmAdminRolesRoleIdPermissionsBulk(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRolePermission.IBulkUpdate;
}): Promise<IErpHrmRole> {
  // Load role to check if built-in
  const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      is_builtin: true,
    },
  });
  // Built-in roles cannot have permissions modified
  if (role.is_builtin) {
    throw new HttpException("Cannot modify permissions on built-in role", 400);
  }
  // Validate permission codes against allowed set
  const ALLOWED_PERMISSIONS = new Set([
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ]);
  const invalidPermissions = props.body.permissions.filter(
    (p) => !ALLOWED_PERMISSIONS.has(p),
  );
  if (invalidPermissions.length > 0) {
    throw new HttpException(
      `Invalid permission codes: ${invalidPermissions.join(", ")}`,
      400,
    );
  }
  // Deduplicate permissions
  const uniquePermissions = [...new Set(props.body.permissions)];
  // Execute bulk update in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete existing permissions
    await tx.erp_hrm_role_permissions.deleteMany({
      where: { erp_hrm_role_id: props.roleId },
    });
    // Insert new permissions
    if (uniquePermissions.length > 0) {
      const permissionData = uniquePermissions.map(
        (permission): Prisma.erp_hrm_role_permissionsCreateManyInput => ({
          id: v4(),
          erp_hrm_role_id: props.roleId,
          permission: permission,
          created_at: new Date(),
          updated_at: new Date(),
        }),
      );
      await tx.erp_hrm_role_permissions.createMany({
        data: permissionData,
      });
    }
    // Update role timestamp
    await tx.erp_hrm_roles.update({
      where: { id: props.roleId },
      data: { updated_at: new Date() },
    });
  });
  // Fetch updated role with transformer
  const updated = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...ErpHrmRoleTransformer.select(),
  });
  return await ErpHrmRoleTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmAdminRolesRoleIdPermissionsBulk(props: {
//   admin: AdminPayload;
//   roleId: string & tags.Format<"uuid">;
//   body: IErpHrmRolePermission.IBulkUpdate;
// }): Promise<IErpHrmRole> {
//   await MyGlobal.prisma.erp_hrm_roles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmRoleTransformer.select(),
//   });
//   return await ErpHrmRoleTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------