import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRole.IUpdate;
}): Promise<IHrmPlatformRole> {
  // Step 1: Fetch role with organization_id and role_kind for validation
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
      name: true,
      description: true,
      role_kind: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      permissions: {
        select: {
          id: true,
          code: true,
        },
      },
    },
  });
  // Step 2: Reject built-in roles with 403 Forbidden
  if (role.role_kind === "built_in") {
    throw new HttpException("Cannot modify built-in role", 403);
  }
  // Step 3: Validate name uniqueness if provided (case-insensitive)
  if (props.body.name !== undefined) {
    const existingRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
      where: {
        organization_id: role.organization_id,
        name: {
          equals: props.body.name,
          mode: "insensitive",
        },
        id: {
          not: props.roleId,
        },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (existingRole !== null) {
      throw new HttpException("Role name already exists", 409);
    }
  }
  // Step 4: Validate permission codes if provided
  if (props.body.permissions !== undefined) {
    const permissionCodes: string[] = props.body.permissions;
    const orgPermissions =
      await MyGlobal.prisma.hrm_platform_permissions.findMany({
        where: {
          organization_id: role.organization_id,
          code: {
            in: permissionCodes,
          },
        },
        select: { code: true },
      });
    const existingCodes: Set<string> = new Set(
      orgPermissions.map((permission) => permission.code),
    );
    const invalidCodes: string[] = permissionCodes.filter(
      (code) => !existingCodes.has(code),
    );
    if (invalidCodes.length > 0) {
      throw new HttpException(
        `Invalid permission codes: ${invalidCodes.join(", ")}`,
        400,
      );
    }
  }
  // Step 5: Apply updates with ISO string timestamp
  await MyGlobal.prisma.hrm_platform_roles.update({
    where: { id: props.roleId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: toISOStringSafe(new Date()),
      ...(props.body.permissions !== undefined && {
        permissions: {
          deleteMany: {
            role_id: props.roleId,
          },
          create: props.body.permissions.map((permission_code: string) => ({
            organization_id: role.organization_id,
            code: permission_code,
            description: null,
            id: v4(),
            created_at: new Date(),
            updated_at: new Date(),
          })),
        },
      }),
    },
  });
  // Step 6: Fetch updated role with full data using transformer
  const updated = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...HrmPlatformRoleTransformer.select(),
  });
  return await HrmPlatformRoleTransformer.transform(updated);
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
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberRolesRoleId(props: {
//   member: MemberPayload;
//   roleId: string & tags.Format<"uuid">;
//   body: IHrmPlatformRole.IUpdate;
// }): Promise<IHrmPlatformRole> {
//   await MyGlobal.prisma.hrm_platform_roles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformRoleTransformer.select(),
//   });
//   return await HrmPlatformRoleTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------