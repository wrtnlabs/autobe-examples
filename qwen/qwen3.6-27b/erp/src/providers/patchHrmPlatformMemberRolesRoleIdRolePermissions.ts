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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRolePermissionTransformer } from "../transformers/HrmPlatformRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberRolesRoleIdRolePermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRole.IPermissionUpdate;
}): Promise<IHrmPlatformRolePermission> {
  // Fetch role to validate existence and properties
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      built_in: true,
      deleted_at: true,
    },
  });
  // Validate role is not deactivated
  if (role.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Built-in roles cannot be modified through this endpoint
  if (role.built_in) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify member is an active employee of the role's organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
      hrm_platform_organization_id: role.hrm_platform_organization_id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Replace permissions atomically within a transaction
  await MyGlobal.prisma.$transaction([
    // Delete existing role-permission associations for this role
    MyGlobal.prisma.hrm_platform_role_permissions.deleteMany({
      where: { hrm_platform_role_id: props.roleId },
    }),
    // Create new association records for each requested permission key
    ...props.body.permissionKeys.map((permissionKey) =>
      MyGlobal.prisma.hrm_platform_role_permissions.create({
        data: {
          id: v4(),
          role: { connect: { id: props.roleId } },
          permission_key: permissionKey,
          created_at: new Date(),
          updated_at: new Date(),
        },
      }),
    ),
    // Update the role's updated_at timestamp
    MyGlobal.prisma.hrm_platform_roles.update({
      where: { id: props.roleId },
      data: { updated_at: new Date() },
    }),
  ]);
  // Retrieve a permission record for the updated role with necessary relations
  const record =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirstOrThrow({
      ...HrmPlatformRolePermissionTransformer.select(),
      where: { hrm_platform_role_id: props.roleId },
    });
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
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberRolesRoleIdRolePermissions(props: {
//   member: MemberPayload;
//   roleId: string & tags.Format<"uuid">;
//   body: IHrmPlatformRole.IPermissionUpdate;
// }): Promise<IHrmPlatformRolePermission> {
//   const record = await MyGlobal.prisma.hrm_platform_role_permissions.findFirstOrThrow({
//     ...HrmPlatformRolePermissionTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformRolePermissionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------