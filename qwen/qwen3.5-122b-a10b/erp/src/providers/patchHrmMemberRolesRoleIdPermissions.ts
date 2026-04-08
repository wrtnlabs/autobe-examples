import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
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

export async function patchHrmMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmRole.IUpdatePermission;
}): Promise<IHrmRole> {
  // 1. Find the role by roleId
  const role = await MyGlobal.prisma.hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      is_builtin: true,
      hrm_organization_id: true,
    },
  });
  // 2. Check if role is built-in
  if (role.is_builtin === true) {
    throw new HttpException(
      "Built-in roles cannot have their permissions modified",
      403,
    );
  }
  // 3. Validate all permission IDs exist
  const permissionIds = props.body.permission_ids;
  if (permissionIds.length === 0) {
    throw new HttpException("At least one permission ID is required", 400);
  }
  const permissions = await MyGlobal.prisma.hrm_permissions.findMany({
    where: {
      id: {
        in: permissionIds,
      },
    },
    select: {
      id: true,
    },
  });
  if (permissions.length !== permissionIds.length) {
    const foundIds = new Set(permissions.map((p) => p.id));
    const missingIds = permissionIds.filter((id) => !foundIds.has(id));
    throw new HttpException(
      `Permission IDs not found: ${missingIds.join(", ")}`,
      400,
    );
  }
  // 4-7. Transaction: delete old role_permissions, insert new ones
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete all existing role_permissions for this role
    await tx.hrm_role_permissions.deleteMany({
      where: {
        hrm_role_id: props.roleId,
      },
    });
    // Insert new role_permissions for each permission ID
    await Promise.all(
      permissionIds.map((permissionId) =>
        tx.hrm_role_permissions.create({
          data: {
            id: v4(),
            hrm_role_id: props.roleId,
            hrm_permission_id: permissionId,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
        }),
      ),
    );
  });
  // 8. Query the updated role with rolePermissions joined
  const updatedRole = await MyGlobal.prisma.hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...HrmRoleTransformer.select(),
  });
  // 9. Transform and return
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
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberRolesRoleIdPermissions(props: {
//   member: MemberPayload;
//   roleId: string & tags.Format<"uuid">;
//   body: IHrmRole.IUpdatePermission;
// }): Promise<IHrmRole> {
//   const record = await MyGlobal.prisma.hrm_roles.findFirstOrThrow({
//     ...HrmRoleTransformer.select(),
//     where: { ... },
//   });
//   return await HrmRoleTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------