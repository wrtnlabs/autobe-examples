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
import { ErpHrmRolePermissionTransformer } from "../transformers/ErpHrmRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminRolesRoleIdPermissionsPermissionId(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  permissionId: string;
}): Promise<IErpHrmRolePermission> {
  // Step 1: Validate role exists and get organization
  const role = await MyGlobal.prisma.erp_hrm_roles.findUnique({
    where: { id: props.roleId },
    select: { id: true, erp_hrm_organization_id: true, is_builtin: true },
  });
  if (role === null) {
    throw new HttpException("Role not found", 404);
  }
  // Step 2: Verify role is not built-in
  if (role.is_builtin) {
    throw new HttpException(
      "Built-in roles cannot have permissions modified",
      403,
    );
  }
  // Step 3: Validate permissionId against allowed set
  const ALLOWED_PERMISSIONS = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ] as const;
  if (
    !ALLOWED_PERMISSIONS.includes(
      props.permissionId as (typeof ALLOWED_PERMISSIONS)[number],
    )
  ) {
    throw new HttpException("Invalid permission code", 400);
  }
  // Step 4: Check if permission already assigned (idempotent behavior)
  const existing = await MyGlobal.prisma.erp_hrm_role_permissions.findUnique({
    where: {
      erp_hrm_role_id_permission: {
        erp_hrm_role_id: props.roleId,
        permission: props.permissionId,
      },
    },
    ...ErpHrmRolePermissionTransformer.select(),
  });
  if (existing !== null) {
    return await ErpHrmRolePermissionTransformer.transform(existing);
  }
  // Step 5: Create new role permission record
  const now = new Date();
  const created = await MyGlobal.prisma.erp_hrm_role_permissions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      erp_hrm_role_id: props.roleId,
      permission: props.permissionId,
      created_at: now,
      updated_at: now,
    },
    ...ErpHrmRolePermissionTransformer.select(),
  });
  // Step 6: Return created record
  return await ErpHrmRolePermissionTransformer.transform(created);
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
// export async function putErpHrmAdminRolesRoleIdPermissionsPermissionId(props: {
//   admin: AdminPayload;
//   roleId: string & tags.Format<"uuid">;
//   permissionId: string;
// }): Promise<IErpHrmRolePermission> {
//   await MyGlobal.prisma.erp_hrm_role_permissions.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_role_permissions.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmRolePermissionTransformer.select(),
//   });
//   return await ErpHrmRolePermissionTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------