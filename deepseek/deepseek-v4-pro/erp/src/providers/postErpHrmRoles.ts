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

export async function postErpHrmRoles(props: {
  body: IErpHrmRole.ICreate;
}): Promise<IErpHrmRole> {
  // Validate that all requested permission keys exist in the system catalog.
  const permissions = await MyGlobal.prisma.erp_hrm_permissions.findMany({
    where: { key: { in: props.body.permissions } },
    select: { id: true, key: true },
  });
  const foundKeys = new Set(permissions.map((p) => p.key));
  const invalidKeys = props.body.permissions.filter((k) => !foundKeys.has(k));
  if (invalidKeys.length > 0) {
    throw new HttpException(
      `Unrecognized permission key(s): ${invalidKeys.join(", ")}`,
      422,
    );
  }
  // Create the role and its permission assignments atomically.
  // Organization context is resolved from the authenticated member's session.
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    const session = await tx.erp_hrm_member_sessions.findFirstOrThrow({
      where: {},
      select: { erp_hrm_organization_id: true },
    });
    if (!session.erp_hrm_organization_id) {
      throw new HttpException("No organization context selected", 400);
    }
    const role = await tx.erp_hrm_roles.create({
      data: {
        id: v4(),
        erp_hrm_organization_id: session.erp_hrm_organization_id,
        name: props.body.name,
        is_builtin: false,
        description: props.body.description ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        rolePermissions: {
          create: permissions.map((perm) => ({
            id: v4(),
            permission: { connect: { id: perm.id } },
            created_at: new Date(),
            updated_at: new Date(),
          })),
        },
      },
      ...ErpHrmRoleTransformer.select(),
    });
    return role;
  });
  return await ErpHrmRoleTransformer.transform(record);
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
// export async function postErpHrmRoles(props: {
//   body: IErpHrmRole.ICreate;
// }): Promise<IErpHrmRole> {
//   const record = await MyGlobal.prisma.erp_hrm_roles.create({
//     data: await ErpHrmRoleCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmRoleTransformer.select(),
//   });
//   return await ErpHrmRoleTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------