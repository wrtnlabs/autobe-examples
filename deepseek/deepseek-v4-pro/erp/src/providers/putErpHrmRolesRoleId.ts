import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmRoleTransformer } from "../transformers/ErpHrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmRolesRoleId(props: {
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRole.IUpdate;
}): Promise<IErpHrmRole> {
  // 1. Fetch current role to check existence, built-in status, and org context
  const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      name: true,
      is_builtin: true,
      deleted_at: true,
    },
  });
  // 2. Reject modification of built-in roles (Owner, Manager, Employee)
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 403);
  }
  // 3. Validate name uniqueness within the organization (only if name is changing)
  if (props.body.name !== undefined && props.body.name !== role.name) {
    const existingRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        erp_hrm_organization_id: role.erp_hrm_organization_id,
        name: props.body.name,
        id: { not: props.roleId },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (existingRole) {
      throw new HttpException(
        "Role name must be unique within the organization",
        409,
      );
    }
  }
  // 4. Execute permission replacement and metadata update atomically
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (props.body.permission_ids !== undefined) {
      // Delete all existing permission assignments for this role
      await tx.erp_hrm_role_permissions.deleteMany({
        where: { erp_hrm_role_id: props.roleId },
      });
      // Insert the new permission set
      if (props.body.permission_ids.length > 0) {
        await tx.erp_hrm_role_permissions.createMany({
          data: props.body.permission_ids.map((permissionId) => ({
            id: v4(),
            erp_hrm_role_id: props.roleId,
            erp_hrm_permission_id: permissionId,
            created_at: now,
            updated_at: now,
          })),
        });
      }
    }
    // Update role metadata
    await tx.erp_hrm_roles.update({
      where: { id: props.roleId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        updated_at: now,
      },
    });
  });
  // 5. Re-query and transform the fully updated role
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
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmRolesRoleId(props: {
//   roleId: string & tags.Format<"uuid">;
//   body: IErpHrmRole.IUpdate;
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