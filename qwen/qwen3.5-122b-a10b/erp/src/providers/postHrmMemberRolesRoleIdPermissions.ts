import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmRoleTransformer } from "../transformers/HrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmRolePermission.IAssign;
}): Promise<IHrmRole> {
  const role = await MyGlobal.prisma.hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      is_builtin: true,
      hrm_organization_id: true,
    },
  });
  if (role.is_builtin === true) {
    throw new HttpException("Cannot modify built-in role permissions", 403);
  }
  const invalidPermissions: string[] = [];
  for (const permissionId of props.body.permission_ids) {
    const permission = await MyGlobal.prisma.hrm_permissions.findUnique({
      where: { id: permissionId },
    });
    if (permission === null) {
      invalidPermissions.push(permissionId);
    }
  }
  if (invalidPermissions.length > 0) {
    throw new HttpException(
      `Invalid permission IDs: ${invalidPermissions.join(", ")}`,
      400,
    );
  }
  await MyGlobal.prisma.hrm_role_permissions.createMany({
    data: props.body.permission_ids.map((permissionId) => ({
      id: v4(),
      hrm_role_id: props.roleId,
      hrm_permission_id: permissionId,
      created_at: new Date(),
      updated_at: new Date(),
    })),
    skipDuplicates: true,
  });
  const updatedRole = await MyGlobal.prisma.hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...HrmRoleTransformer.select(),
  });
  return await HrmRoleTransformer.transform(updatedRole);
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
// import { IHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRolePermission";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmMemberRolesRoleIdPermissions(props: {
//   member: MemberPayload;
//   roleId: string & tags.Format<"uuid">;
//   body: IHrmRolePermission.IAssign;
// }): Promise<IHrmRole> {
//   const record = await MyGlobal.prisma.hrm_roles.findFirstOrThrow({
//     ...HrmRoleTransformer.select(),
//     where: { ... },
//   });
//   return await HrmRoleTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------