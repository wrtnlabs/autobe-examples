import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformRolePermissionCollector } from "../collectors/HrmPlatformRolePermissionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRolePermissionTransformer } from "../transformers/HrmPlatformRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberRolesRoleIdRolePermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRolePermission.ICreate;
}): Promise<IHrmPlatformRolePermission> {
  // 1. Find the role and verify it exists
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: { id: true, hrm_platform_organization_id: true, built_in: true },
  });
  // 2. Verify role is not built-in (built-in roles cannot be modified)
  if (role.built_in === true) {
    throw new HttpException("Built-in roles cannot be modified", 400);
  }
  // 3. Verify role belongs to the member's organization context
  const member = await MyGlobal.prisma.hrm_platform_members.findUnique({
    where: { id: props.member.id },
    select: {
      employees: {
        where: {
          hrm_platform_organization_id: role.hrm_platform_organization_id,
        },
        select: { id: true },
      },
    },
  });
  if (member === null || member.employees.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Check for duplicate permission on same role (unique constraint: role_id + permission_key)
  const existing =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: props.roleId,
        permission_key: props.body.permissionKey,
      },
    });
  if (existing !== null) {
    throw new HttpException("Permission already exists for this role", 409);
  }
  // 5. Create the role-permission mapping using collector
  const record = await MyGlobal.prisma.hrm_platform_role_permissions.create({
    data: await HrmPlatformRolePermissionCollector.collect({
      body: props.body,
      hrmPlatformRoles: role,
    }),
    ...HrmPlatformRolePermissionTransformer.select(),
  });
  // 6. Transform and return the created record
  return await HrmPlatformRolePermissionTransformer.transform(record);
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
// import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformMemberRolesRoleIdRolePermissions(props: {
//   member: MemberPayload;
//   roleId: string & tags.Format<"uuid">;
//   body: IHrmPlatformRolePermission.ICreate;
// }): Promise<IHrmPlatformRolePermission> {
//   const record = await MyGlobal.prisma.hrm_platform_role_permissions.create({
//     data: await HrmPlatformRolePermissionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformRolePermissionTransformer.select(),
//   });
//   return await HrmPlatformRolePermissionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------