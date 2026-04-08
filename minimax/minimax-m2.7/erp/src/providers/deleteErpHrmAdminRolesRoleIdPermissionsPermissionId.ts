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

export async function deleteErpHrmAdminRolesRoleIdPermissionsPermissionId(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  permissionId: string;
}): Promise<{
  id: string;
  permission: string;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}> {
  // Query the role to verify it exists
  const role = await MyGlobal.prisma.erp_hrm_roles.findUnique({
    where: { id: props.roleId },
    select: {
      id: true,
      name: true,
      is_builtin: true,
      erp_hrm_organization_id: true,
    },
  });
  // If role not found, return 404
  if (role === null) {
    throw new HttpException(`Role with id ${props.roleId} not found`, 404);
  }
  // Built-in roles cannot be modified
  if (role.is_builtin) {
    throw new HttpException(`Built-in roles cannot be modified`, 400);
  }
  // Find the role permission record
  const rolePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: props.roleId,
        permission: props.permissionId,
      },
      select: {
        id: true,
        permission: true,
        created_at: true,
        updated_at: true,
      },
    });
  // If permission not found on this role, return 404
  if (rolePermission === null) {
    throw new HttpException(
      `Permission '${props.permissionId}' is not assigned to this role`,
      404,
    );
  }
  // Delete the role permission
  await MyGlobal.prisma.erp_hrm_role_permissions.delete({
    where: {
      id: rolePermission.id,
    },
  });
  // Return the deleted permission information
  return {
    id: rolePermission.id,
    permission: rolePermission.permission,
    created_at: rolePermission.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: rolePermission.updated_at.toISOString() as string &
      tags.Format<"date-time">,
  };
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteErpHrmAdminRolesRoleIdPermissionsPermissionId(props: {
//   admin: AdminPayload;
//   roleId: string & tags.Format<"uuid">;
//   permissionId: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------