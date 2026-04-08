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
import { ErpHrmRolePermissionCollector } from "../collectors/ErpHrmRolePermissionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmRolePermissionTransformer } from "../transformers/ErpHrmRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminRolesRoleIdPermissions(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRolePermission.ICreate;
}): Promise<IErpHrmRolePermission> {
  // Verify the role exists
  const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      name: true,
      is_builtin: true,
      erp_hrm_organization_id: true,
    },
  });
  // Built-in roles (Owner, Manager, Employee) cannot have their permissions modified
  if (role.is_builtin) {
    throw new HttpException("Cannot modify permissions of built-in roles", 403);
  }
  // Check if the permission is already assigned to this role
  const existingPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: props.roleId,
        permission: props.body.permission,
      },
    });
  if (existingPermission) {
    throw new HttpException("Permission is already assigned to this role", 409);
  }
  // Create the role-permission association
  const record = await MyGlobal.prisma.erp_hrm_role_permissions.create({
    data: await ErpHrmRolePermissionCollector.collect({
      body: props.body,
      role: { id: role.id },
    }),
    ...ErpHrmRolePermissionTransformer.select(),
  });
  return await ErpHrmRolePermissionTransformer.transform(record);
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
// export async function postErpHrmAdminRolesRoleIdPermissions(props: {
//   admin: AdminPayload;
//   roleId: string & tags.Format<"uuid">;
//   body: IErpHrmRolePermission.ICreate;
// }): Promise<IErpHrmRolePermission> {
//   const record = await MyGlobal.prisma.erp_hrm_role_permissions.create({
//     data: await ErpHrmRolePermissionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmRolePermissionTransformer.select(),
//   });
//   return await ErpHrmRolePermissionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------