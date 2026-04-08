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

export async function putErpHrmAdminRolesRoleId(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRole.IUpdate;
}): Promise<IErpHrmRole> {
  const role = await MyGlobal.prisma.erp_hrm_roles.findUnique({
    where: { id: props.roleId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      is_builtin: true,
      deleted_at: true,
    },
  });
  if (role === null || role.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 403);
  }
  if (props.body.name !== undefined) {
    const existingRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        erp_hrm_organization_id: role.erp_hrm_organization_id,
        name: props.body.name,
        id: { not: props.roleId },
        deleted_at: null,
      },
    });
    if (existingRole !== null) {
      throw new HttpException("Role name already exists in organization", 409);
    }
  }
  const permissionPattern = /^[a-z]+:[a-z_]+$/;
  for (const permissionCode of props.body.permissionCodes) {
    if (!permissionPattern.test(permissionCode)) {
      throw new HttpException("Invalid permission code", 400);
    }
  }
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_roles.update({
      where: { id: props.roleId },
      data: {
        name: props.body.name,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.erp_hrm_role_permissions.deleteMany({
      where: { erp_hrm_role_id: props.roleId },
    }),
    MyGlobal.prisma.erp_hrm_role_permissions.createMany({
      data: props.body.permissionCodes.map((permissionCode) => ({
        id: v4() as string & tags.Format<"uuid">,
        erp_hrm_role_id: props.roleId,
        permission: permissionCode,
        created_at: now,
        updated_at: now,
      })),
    }),
  ]);
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
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmAdminRolesRoleId(props: {
//   admin: AdminPayload;
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